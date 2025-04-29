from datetime import datetime, timezone
from sqlalchemy import JSON, Boolean, Column, DateTime, Integer, String, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from database import Base
import enum

class UserRole(enum.Enum):
    ADMIN = "admin"
    REGULAR = "regular"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.REGULAR)
    pantry = relationship("Pantry", back_populates="user")

class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True) # primary key
    name = Column(String, unique=False, index=True, nullable=False) # ingredient name

    recipe_ingredients = relationship("RecipeIngredient", back_populates="ingredient")
    pantry_entries = relationship("Pantry", back_populates="ingredient")

class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    amount = Column(String, nullable=False)

    recipe = relationship("Recipe", back_populates="ingredients")
    ingredient = relationship("Ingredient", back_populates="recipe_ingredients")


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True) # primary key
    recipe_name = Column(String, unique=False, index=True, nullable=False) # recipe name
    author = Column(String, unique=False, index=True, nullable=True) # recipe author
    instructions = Column(Text, unique=False, index=True, nullable=True) # steps to prepare dish

    ingredients = relationship("RecipeIngredient", back_populates="recipe")

class Pantry(Base):
    __tablename__ = "pantry"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)

    user = relationship("User", back_populates="pantry")
    ingredient = relationship("Ingredient", back_populates="pantry_entries")

class RecipeCache(Base):
    __tablename__ = "recipe_cache"

    id = Column(String, primary_key=True)
    data = Column(JSON)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    expires_at = Column(DateTime)

class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    updated_at = Column(DateTime, onupdate=datetime.now(timezone.utc))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipe_id = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    is_deleted = Column(Boolean, default=False) # for soft delete

    user = relationship("User")
    replies = relationship("Comment", back_populates="parent", cascade="all, delete-orphan")
    parent = relationship("Comment", back_populates="replies", remote_side=[id])