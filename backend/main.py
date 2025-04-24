import asyncio
import random
from fastapi import FastAPI, Depends, HTTPException, Query, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.encoders import jsonable_encoder
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache
from redis import asyncio as aioredis
import httpx
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from database import engine, Base, get_db
from models import User, Recipe, Ingredient, Pantry, RecipeIngredient, UserRole
from utils import create_access_token, decode_access_token, hash_password, verify_password
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any, AsyncIterator
from contextlib import asynccontextmanager
from enum import Enum
import pickle
import networkx as nx
from itertools import combinations
import os
import re

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    redis = aioredis.from_url(
        "redis://localhost:6379",
        encoding="utf8",
        decode_responses=True
    )
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
    print("Redis cache initialised")

    yield

    await redis.close()
    print("Redis connection closed")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",
                   "http://127.0.0.1:3000"],  # Allows all origins (change to specific domains in production)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
    expose_headers=["*"]
)

# OAuth2PasswordBearer used to extract JWT token from headers
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Create database tables
Base.metadata.create_all(bind=engine)

class UserCreate(BaseModel):
    username: str
    email: EmailStr # valid format
    password: str
    role: UserRole = UserRole.REGULAR

class UserVerify(BaseModel):
    username: str
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr

class RecipeCreate(BaseModel):
    name: str
    instructions: str
    author: Optional[str] = ""

class IngredientCreate(BaseModel):
    name: str

class PantryItem(BaseModel):
    id: int
    name: str

class PantryCreate(BaseModel):
    user_id: int
    ingredient_id: int

class IngredientSearch(BaseModel):
    name: str

class BulkIngredientCreate(BaseModel):
    ingredients: List[str]

class IngredientList(BaseModel):
    ingredients: List[str]

# Check if user is admin for locked functions
async def is_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    user_data = decode_access_token(token)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    user = db.query(User).filter(User.id == user_data.get("user_id")).first()
    if not user or user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Requries Admin"
        )
    return user

# ============ User API endpoints ============ #

@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    # verify user
    token_data = decode_access_token(token)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid Token"
        )
    if token_data.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not authorised"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

@app.post("/users/")
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(
        (User.username == user.username) | (User.email == user.email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists."
        )


    hashed_password = hash_password(user.password)
    db_user = User(username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    try:
        db.commit()
        db.refresh(db_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username/Email already Exists"
        )

    return {"message": "User successfully created", "user": db_user}

@app.put("/users/{user_id}")
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    # verify user
    token_data = decode_access_token(token)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid Token"
        )
    if token_data.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not authorised"
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    update_data = user_update.model_dump(exclude_unset=True)

    # Only require current password for email changes or password changes
    if ('email' in update_data or 'new_password' in update_data) and not update_data.get('current_password'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is required to change email or password"
        )
    
    if 'current_password' in update_data:
        if not verify_password(update_data['current_password'], user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect currnent password"
            )
        
    if 'new_password' in update_data:
        user.hashed_password = hash_password(update_data['new_password'])

    if 'username' in update_data:
        existing_user = db.query(User).filter(
            User.username == update_data['username'],
            User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already in use"
            )
        user.username = update_data['username']
        
    if 'email' in update_data:
        existing_user = db.query(User).filter(
            User.email == update_data['email'],
            User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        user.email = update_data['email']

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database integrity error"
        )
    
    return user

@app.post("/login/")
def login(user: UserVerify, db: Session = Depends(get_db)):
    user_db = db.query(User).filter(User.username == user.username).first()
    if not user_db or not verify_password(user.password, user_db.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid login details",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token_data = {
        "userId": user_db.id,
        "role": user_db.role.value.lower(),
        "sub": user_db.username
    }

    access_token = create_access_token(data=token_data)
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/logout/")
def logout(token: str = Depends(oauth2_scheme)):
    # client discards token
    return {"message": "discard token to log out"}

@app.get("/protected/")
def protected_route(token: str = Depends(oauth2_scheme)):
    user_data = decode_access_token(token)
    if user_data is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Token")
    
    # Extract user info
    username = user_data.get("sub")
    return {"message": f"Hello {username}, this is a protected route."}

# ============ Recipe API endpoints ============ #

@app.post("/recipes/")
def add_recipe(recipe: RecipeCreate, db: Session = Depends(get_db)):
    # could halt identical recipes but for now I will trust users
    
    db_recipe = Recipe(name=recipe.name, instructions=recipe.instructions, author=recipe.author)
    db.add(db_recipe)
    db.commit()
    db.refresh(db_recipe)

    return {"message": "Recipe successfully created", "recipe": db_recipe}

# ============ Ingredient API endpoints ============ #

@app.post("/ingredients/")
def add_ingredient(ingredient: IngredientCreate, db: Session = Depends(get_db)):
    # check if ingredient already exists
    existing_ingredient = db.query(Ingredient).filter(Ingredient.name == ingredient.name).first()
    if existing_ingredient:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ingredient already exists")
    
    new_ingredient = Ingredient(name=ingredient.name)
    db.add(new_ingredient)
    db.commit()
    db.refresh(new_ingredient)

    return {"message": "Ingredient successfully created", "ingredient": new_ingredient}

@app.get("/ingredients/search/")
def search_ingredients(q: str, db: Session = Depends(get_db)):
    ingredients = db.query(Ingredient).filter(
        Ingredient.name.ilike(f"%{q}%")
    ).limit(10).all()

    return [{"id": ing.id, "name": ing.name} for ing in ingredients]

# ============ Pantry API endpoints ============ #

@app.post("/pantry/")
def add_to_pantry(pantry_create: PantryCreate, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):

    # token validation
    user_data = decode_access_token(token)
    if not user_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Token")
    if user_data.get("user_id") != pantry_create.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorised")
    
    print(f"Adding to pantry of user:{pantry_create.user_id}, Ingredient: {pantry_create.ingredient_id}")
    
    try:
        # query db
        user = db.query(User).filter(User.id == pantry_create.user_id).first()

        # check if user exists
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="User not found"
            )
        
        # check if ingredient exists
        ingredient = db.query(Ingredient).filter(Ingredient.id == pantry_create.ingredient_id).first()
        if not ingredient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Ingredient not found"
            )
        
        # check if ingredient already exists in pantry
        existing_pantry_item = db.query(Pantry).filter(
            Pantry.user_id == pantry_create.user_id, 
            Pantry.ingredient_id == pantry_create.ingredient_id
        ).first()

        if existing_pantry_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Ingredient already in pantry."
            )
        
        # add ingredient to pantry
        pantry_entry = Pantry(user_id=pantry_create.user_id, ingredient_id=pantry_create.ingredient_id)
        db.add(pantry_entry)
        db.commit()
        db.refresh(pantry_entry)

        return {
            "message": "Ingredient added to pantry", 
            "pantry_entry": pantry_entry,
            "id": pantry_entry.id,
            "user_id": pantry_entry.user_id,
            "ingredient_id": pantry_entry.ingredient_id
        }
    
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database Integrity Error."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.get("/pantry/")
def get_pantry_items(user_id: int, db: Session = Depends(get_db)):
    pantry_items = db.query(Pantry, Ingredient).join(
        Ingredient, Pantry.ingredient_id == Ingredient.id
    ).filter(Pantry.user_id == user_id).all()

    return [{"pantry_id": item.Pantry.id, "id": item.Ingredient.id, "name": item.Ingredient.name} for item in pantry_items]

@app.delete("/pantry/{pantry_id}")
def remove_from_pantry(
    pantry_id: int,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    try:
        # verify user
        user_data = decode_access_token(token)
        if not user_data: 
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # find item
        pantry_item = db.query(Pantry).filter(Pantry.id == pantry_id).first()
        if not pantry_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pantry item not found"
            )
        
        # verify ownership
        if pantry_item.user_id != user_data.get("user_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorised to delete this item"
            )
        
        # delete
        db.delete(pantry_item)
        db.commit()
        
        return {"message": "Item removed from pantry"}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )



# ============ RecipeIngredient API endpoints ============ #
@app.post("/recipe-ingredients")
def add_recipe_ingredient(recipe_id: int, ingredient_id: int, amount: str, db: Session = Depends(get_db)):
    # check if recipe exists
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found.")
    
    # check if ingredient exists
    ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not ingredient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingredient not found.")
    
    # create the recipe-ingredient relationship
    recipe_ingredient = RecipeIngredient(recipe_id=recipe_id, ingredient_id=ingredient_id, amount=amount)
    db.add(recipe_ingredient)
    db.commit()
    db.refresh(recipe_ingredient)
    
    return {"message": "Ingredient added to recipe", "recipe_ingredient": recipe_ingredient}


# ============ Ingredient Compatibility Endpoints ============ #
def extract_main_ingredient(ingredient):
    ingredient = ingredient.lower() # standardise to lower case
    # this took a long time to think of, I hope this is appreciated
    forms = [
        'shredded', 'grated', 'minced', 'chopped', 'diced', 'ground', 'crushed', 
        'sliced', 'fresh', 'frozen', 'canned', 'whole', 'boneless', 'skinless',
        'bone-in', 'skin-on', 'salted', 'unsalted', 'organic', 'large', 'medium',
        'small', 'tinned', 'smoked', 'unsmoked', 'lean', 'hearty', 'flowerets',
        'florets', 'skim', 'skimmed', 'whole', 'cooked', 'roast', 'roasted',
        'baked', 'hot', 'cold', 'dried', 'raw', 'peeled', 'seeded', 'stemmed',
        'pitted', 'cored', 'juiced', 'zested', 'melted', 'softened', 'hardened',
        'powdered', 'granulated', 'crumbled', 'cubed', 'quartered', 'halved',
        'mashed', 'whipped', 'beaten', 'stiff', 'divided', 'optional', 'to taste',
        'enriched', 'iodized', 'substitute', 'wholewheat', 'new', 'kosher', 'powdered',
        'instant', 'freshly', 'cracked', 'curls'
    ]
    ingredient = re.sub(r'\(.*?\)', '', ingredient) # remove brackets

    for form in forms:
        ingredient = re.sub(rf'\b{form}\b', '', ingredient) # get rid of modifiers such as roast

    ingredient = re.sub(r'\b\d+\s*\w*\b', '', ingredient) # remove measurements

    ingredient = re.sub(r'\s+', ' ', ingredient).strip() # collapse multiple spaces

    # handle similar ingredients / special csaes
    similar_map = {
        r'.*cheese$': 'cheese',
        r'.*oil$': 'oil',
        r'.*milk$': 'milk',
        r'.*cream$': 'cream',
        r'.*vinegar$': 'vinegar',
        r'.*chocolate$': 'chocolate',
        r'.*yogurt$': 'yogurt',
        r'.*flour$': 'flour',
        r'.*sugar$': 'sugar',
        r'.*salt$': 'salt',
        r'.*pepper$': 'pepper',
        r'.*peppers$': 'pepper',
        r'.*onion$': 'onion',
        r'.*garlic$': 'garlic',
        r'.*tomato$': 'tomato',
        r'.*chicken$': 'chicken',
        r'.*beef$': 'beef',
        r'.*pork$': 'pork',
        r'.*peas$': 'peas',
        r'.*cider$': 'cider',
        r'.*onion$': 'onion'
    }

    for pattern, replacement in similar_map.items():
        if re.fullmatch(pattern, ingredient):
            ingredient = replacement
            break
    
    # specific replacements
    replacements = {
        'tomatoes': 'tomato',
        'green onion': 'scallion',
        'green onions': 'scallions',
        'spring onions': 'scallions',
        'mozzarella cheese': 'mozzarella',
        'cheddar cheese': 'cheddar',
        'feta cheese': 'feta',
        'aubergine': 'eggplant',
        'courgette': 'zucchini',
        'rocket': 'arugula',
        'coriander': 'cilantro',
        'chips': 'fries',
        'beetroot': 'beet',
        'prawn': 'shrimp',
        'all-purpose-flour': 'flour',
        'all purpose flour': 'flour',
        'plain flour': 'flour',
        'corn flour': 'cornstarch',
        'corn starch': 'cornstarch',
        'broad beans': 'fava beans',
        'mince beef': 'ground beef',
        'minced beef': 'ground beef',
        'mince pork': 'ground pork',
        'minced pork': 'ground pork',
        'mince chicken': 'ground chicken',
        'minced chicken': 'ground chicken',
        'tomato sauce': 'ketchup',
        'tomato paste': 'tomato',
        'tomato purée': 'tomato',
        'whole milk': 'milk',
        'semi-skimmed milk': 'milk',
        'skimmed milk': 'milk',
        'gherkin': 'pickle',
        'gherkins': 'pickles',
        'porridge oats': 'oats',
        'porridge': 'oats',
        'icing sugar': 'powdered sugar',
        'confectioners sugar': 'powdered sugar',
        'caster sugar': 'sugar',
        'granulated sugar': 'sugar',
        'brown sugar': 'sugar',
        'white sugar': 'sugar',
        'yogurt': 'yoghurt',
        'yoghurt': 'yoghurt',
        'natural yoghurt': 'yoghurt',
        'vanilla extract': 'vanilla',
        'vanilla essence': 'vanilla'
    }
    for original, replacement in replacements.items():
        if original == ingredient:
            ingredient = replacement
            break
    return ingredient

@app.post("/compatibility/")
def get_ingredient_compatibility(
    ingredient_list: IngredientList,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    PMI_THRESHOLD = 1.0
    MIN_CLIQUE_SIZE = 2
    MAX_CLIQUE_SIZE = 15

    # same filtering system as used in graph creation
    ingredients = ingredient_list.ingredients
    for i, ingredient in enumerate(ingredients):
        print(ingredient)
        ingredients[i] = extract_main_ingredient(ingredient)
        print(ingredients[i])

    print(ingredients)

    # verify user
    try:
        user_data = decode_access_token(token)
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        user = db.query(User).filter(User.id == user_data.get("user_id")).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Auth error: " + str(e)
        )
    
    # load compatibility data 
    try:
        with open('../src/data/compatibility_graph.pkl', 'rb') as f:
            data = pickle.load(f)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Compatibility data not found"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error loading compatibility data"
        )

    # load PMI (pointwise mutual information) and graph
    pmi = data['pmi_scores']
    G_full = data['graph']

    pantry = [ing for ing in ingredients if ing in G_full]

    subgraph = nx.Graph()
    for a, b in combinations(pantry, 2):
        key = tuple(sorted((a,b)))
        if key in pmi and pmi[key] > PMI_THRESHOLD:
            subgraph.add_edge(a, b, weight=pmi[key])
    
    cliques = list(nx.find_cliques(subgraph))

    results = []
    for clique in cliques:
        if len(cliques) < MIN_CLIQUE_SIZE or len(cliques) > MAX_CLIQUE_SIZE:
            continue
        total = 0
        count = 0
        for a, b in combinations(clique, 2):
            key = tuple(sorted((a,b)))
            total += pmi.get(key, 0)
            count += 1
        if count == 0:
            continue 

        avg_score = total / count

        results.append({
            'ingredients': clique,
            'score': round(avg_score, 2),
            'size': len(clique)
        })

    results.sort(key=lambda x: (-x['score'], -x['size']))
    print(results)
    return results
    
# ============ Protected/Admin API endpoints ============ #
@app.get("/verifyAdmin")
def verify_admin(admin: User = Depends(is_admin)):
    return {
        "status": "verified",
        "user_id": admin.id,
        "username": admin.username
    }

@app.post("/ingredients/bulk/")
def bulk_create_ingredients(
    ingredients: BulkIngredientCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(is_admin)
):
    created = []
    skipped = []

    for name in ingredients.ingredients:
        # check if already exists
        existing = db.query(Ingredient).filter(Ingredient.name == name).first()
        if existing:
            skipped.append(name)
            continue
        # otherwise create new ingredient
        new_ingredient = Ingredient(name=name)
        db.add(new_ingredient)
        created.append(name)
    db.commit()

    return {
        "created": created,
        "skipped": skipped,
        "message": f"Added {len(created)} new ingredients."
    }

# ============ MealDB fetch recipes ============ #
@app.get("/api/recipes")
async def get_mealdb_recipes(
    ingredient: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(6, ge=1, le=20),
):
    MEALDB_API_KEY = os.getenv('MEALDB_API_KEY')
    if not MEALDB_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MeLDB API key not configured"
        )
    
    MEALDB_BASE_URL = f"https://www.themealdb.com/api/json/v2/{MEALDB_API_KEY}"

    try:
        async with httpx.AsyncClient() as client:
            # here we get all recipes for ingredient
            response = await client.get(
                f"{MEALDB_BASE_URL}/filter.php",
                params={"i": ingredient},
                timeout=10.0
            )

            if response.status_code == 429:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests to MealDB API"
                )

            response.raise_for_status()
            data = response.json()

            if not data.get("meals"):
                return {
                    "meals": [],
                    "total": 0,
                    "page": page,
                    "per_page": per_page
                }
            
            # adding pagination to help reduce load on api
            # as it was timing me out for too many requests
            total_recipes = len(data["meals"])
            start = (page - 1) * per_page
            end = min(start + per_page, total_recipes)
            paginated_recipes = data["meals"][start:end]
            print(f"start: {start}")
            print(f"endL: {end}")
            return {
                "meals": paginated_recipes,
                "total": total_recipes,
                "page": page,
                "per_page": per_page,
                "has_more": end < total_recipes
            }
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail="MealDB API error"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    
@app.get("/api/recipes/details")
async def get_recipe_details(
    meal_id: str,
    db: Session = Depends(get_db)
):
    MEALDB_API_KEY = os.getenv('MEALDB_API_KEY')
    MEALDB_BASE_URL = f"https://www.themealdb.com/api/json/v2/{MEALDB_API_KEY}"

    try: 
        async with httpx.AsyncClient() as client:
            # delay to prevent rate limiting
            await asyncio.sleep(0.3) # 300ms delay
            response = await client.get(
                f"{MEALDB_BASE_URL}/lookup.php",
                params={"i": meal_id},
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()

            if not data.get("meals"):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Recipe not found"
                )
            
            return {
                "meal": data["meals"][0],
                "cached": False
            }
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail="MealDB API error"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    
@app.get("/api/recipes/multi-ingredient")
async def get_recipes_by_multiple_ingredients(
    ingredients: str = Query(..., description="Comma separated list of ingredients"),
    page: int = Query(1, ge=1),
    per_page: int = Query(6, ge=1, le=20),
    skip_fetch: bool = Query(False)
):
    MEALDB_API_KEY = os.getenv('MEALDB_API_KEY')
    if not MEALDB_API_KEY: 
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MealDB API key not configured"
        )
    
    MEALDB_BASE_URL = f"https://www.themealdb.com/api/json/v2/{MEALDB_API_KEY}"
    ingredient_list = [ing.strip() for ing in ingredients.split(",") if ing.strip()]
    
    try:
        async with httpx.AsyncClient() as client:
            # Get all recipes that match ANY of the ingredients
            all_recipes = []
            for ingredient in ingredient_list:
                response = await client.get(
                    f"{MEALDB_BASE_URL}/filter.php",
                    params={"i": ingredient},
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()
                if data.get("meals"):
                    all_recipes.extend(data["meals"])

            # remove duplicates
            print(f"all_recipes size: {len(all_recipes)}")
            unique_recipes = {recipe["idMeal"]: recipe for recipe in all_recipes}.values()
            print(f"unique recipes size: {len(unique_recipes)}")
            
            # shuffle and trim recipes to get a random selection
            unique_recipes = list(unique_recipes)
            random.shuffle(unique_recipes) # in place shuffle
            unique_recipes = unique_recipes[:42] # take 42 recipes (divisible by 6 as 6 per page)

            filtered_recipes = []
            for recipe in unique_recipes:
                details = await client.get(
                    f"{MEALDB_BASE_URL}/lookup.php",
                    params={"i": recipe["idMeal"]},
                    timeout=10.0
                )
                details.raise_for_status()
                meal_data = details.json()
                if meal_data.get("meals"):
                    meal = meal_data["meals"][0]
                    recipe_ingredients = set()
                    for i in range(1, 21):
                        ingredient = meal.get(f"strIngredient{i}")
                        if ingredient and ingredient.strip():
                            recipe_ingredients.add(ingredient.lower().strip())
                    matched = sum(1 for ing in ingredient_list if ing.lower() in recipe_ingredients)
                    if matched > 0:
                        filtered_recipes.append({
                            **meal,
                            "matched_ingredients": matched,
                            "total_ingredients": len(recipe_ingredients)
                        })

            filtered_recipes.sort(key=lambda x: (-x["matched_ingredients"], x["total_ingredients"]))

            # Paginate
            total = len(filtered_recipes)
            start = (page - 1) * per_page
            end = start + per_page
            paginated = filtered_recipes[start:end]
            return {
                "meals": paginated,
                "total": total,
                "page": page,
                "per_page": per_page,
                "has_more": end < total
            }
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail="MealDB API error"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )