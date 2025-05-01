# PantryPal

This project has:
**Frontend**: Next.js (React)
**Backend**: FastAPI (Python 3.12)
**Database**: SQLite3

## Backend setup (FastAPI)
1. Navigate to backend directory in terminal
(Recommended) Create a virtual environment
2. Install dependencies:
    pip install -r requirements.txt
3. Create a '.env' file in the backend/ folder with the following lines:
    SECRET_KEY = "abc123"
    MEALDB_API_KEY = "65232507"
4. Run the FastAPI server: 
    uvicorn main:app --reload

Server will be available at http://127.0.0.1:8000

## Frontend setup (Next.js)
1. Navigate to pantrypal root directory in a second terminal window
2. Install dependencies 
    npm install
3. Create a '.env.local' file in the root folder with the following lines:
    NEXT_PUBLIC_MEAL_DB_API_KEY = "65232507"
4. Start development server:
    npm run dev


## Environment Variables
These files are ignored by git so please ensure you create them manually before running the project, else core features will not work!

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
