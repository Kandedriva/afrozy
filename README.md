# Afrozy Market

A modern marketplace application built with React, Node.js, and PostgreSQL.

## Project Structure

```
├── frontend/          # React TypeScript frontend
├── backend/           # Node.js Express backend
└── README.md
```

## Technologies Used

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Axios for API calls

### Backend
- Node.js with Express
- PostgreSQL database
- JWT authentication
- bcryptjs for password hashing

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Afrozy Market"
   ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Configure your database and JWT secret
   npm run dev
   ```

3. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```

### Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/afrozy_market
JWT_SECRET=your_jwt_secret_key_here
```

## Available Scripts

### Backend
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

### Frontend
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

## Features (Planned)

- User authentication and authorization
- Product catalog and search
- Shopping cart functionality
- Order management
- Seller dashboard
- Admin panel

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request