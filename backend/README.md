# Travel System Backend

Backend API server for the Travel System project using Node.js, Express, and TypeScript.

## Features

- RESTful API for hotel/accommodation search and management
- User authentication (register/login)
- CSV-based hotel data storage
- CORS enabled for frontend integration
- TypeScript for type safety
- Error handling middleware

## Project Structure

```
backend/
├── src/
│   ├── data/
│   │   ├── hotels.csv          # Hotel data
│   │   └── mockData.ts         # Legacy mock data
│   ├── routes/
│   │   ├── auth.ts             # Authentication routes
│   │   └── properties.ts       # Hotel/property routes
│   ├── utils/
│   │   └── csvReader.ts        # CSV parsing utilities
│   └── index.ts                # Main application entry point
├── dist/                       # Compiled JavaScript (generated)
├── .env.example                # Environment variables template
├── package.json
└── tsconfig.json
```

## Setup

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Install dependencies:
```powershell
npm install
```

2. Create environment file:
```powershell
Copy-Item .env.example .env
```

3. Edit `.env` file with your configuration (optional for basic usage)

### Development

Run the development server with hot reload:
```powershell
npm run dev
```

The server will start at `http://localhost:5000`

### Build

Compile TypeScript to JavaScript:
```powershell
npm run build
```

### Production

Run the compiled application:
```powershell
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
  - Body: `{ name, email, password }`
  
- `POST /api/auth/login` - Login user
  - Body: `{ email, password }`
  
- `POST /api/auth/logout` - Logout user

### Properties (Hotels)

- `GET /api/properties` - Get all hotels (supports filtering)
  - Query params: `district`, `minPrice`, `maxPrice`, `minStar`, `search`
  
- `GET /api/properties/search?query=<search_term>` - Search hotels
  
- `GET /api/properties/:id` - Get hotel by ID
  
- `GET /api/properties/district/:district` - Get hotels by district
  
- `POST /api/properties/:id/reviews` - Add review to hotel
  - Body: `{ rating, comment }`

## Data Format

Hotels are loaded from `src/data/hotels.csv` with the following fields:
- hotelname, address, district, city
- lat, lon (coordinates)
- price, star rating
- amenities, reviews
- And more...

## Integration with Python Components

The backend can be integrated with Python-based AI/ML features:
- Vector embeddings (hotel_embeddings.npy)
- QA Bot (qabot.py)
- Map visualization (map.py)
- Streamlit web interface (web.py, app.py)

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment mode (development/production)
- `GOOGLE_API_KEY` - For AI features integration

## CORS Configuration

CORS is enabled by default to allow frontend integration. Modify in `src/index.ts` if needed.

## Error Handling

The application includes centralized error handling:
- 404 handler for undefined routes
- 500 handler for server errors
- Detailed error messages in development mode

## Future Enhancements

- [ ] Add JWT authentication
- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Hotel booking functionality
- [ ] Payment integration
- [ ] Advanced search with AI/ML
- [ ] Rate limiting
- [ ] API documentation (Swagger)

## License

ISC
