# Desk Booking App (Preact Version)

This is the Preact version of the Desk Booking App, built with Preact, TypeScript, and Shoelace.styles.

## Features

- Modern UI with Shoelace.styles components
- TypeScript support
- Supabase integration for authentication and data storage
- Responsive design
- Fast and lightweight with Preact

## Getting Started

1. Clone the repository
2. Navigate to the preact directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the production version
- `npm run preview` - Preview the production build locally

## Technologies Used

- Preact
- TypeScript
- Vite
- Shoelace.styles
- Supabase
- Preact Router

## Project Structure

```
preact/
├── src/
│   ├── components/     # React components
│   ├── App.tsx        # Main App component
│   ├── main.tsx       # Entry point
│   ├── types.ts       # TypeScript types
│   └── supabaseClient.ts  # Supabase configuration
├── index.html         # HTML template
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
└── vite.config.ts     # Vite configuration
``` 