# 📡 3T2M1Stay API Documentation

Complete API reference for the 3T2M1Stay hotel booking system.

**Base URL:** `http://localhost:5000/api`

---

## 🔐 Authentication Routes

### Register New User

Creates a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Success Response (201):**
```json
{
  "message": "Registration successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields
  ```json
  { "error": "Email, password, and name are required" }
  ```
- `409 Conflict` - Email already exists
  ```json
  { "error": "Email already registered" }
  ```

---

### Login

Authenticates a user and creates a session.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing credentials
  ```json
  { "error": "Email and password are required" }
  ```
- `401 Unauthorized` - Invalid credentials
  ```json
  { "error": "Invalid email or password" }
  ```

---

### Logout

Ends the user session.

**Endpoint:** `POST /api/auth/logout`

**Success Response (200):**
```json
{
  "message": "Logout successful"
}
```

---

## 🏨 Property Routes

### Get All Properties

Retrieves a list of all hotels/properties with optional filtering.

**Endpoint:** `GET /api/properties`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `district` | string | Filter by district name | `Quận 1` |
| `minPrice` | number | Minimum price in VND | `500000` |
| `maxPrice` | number | Maximum price in VND | `2000000` |
| `minStar` | number | Minimum star rating (1-5) | `3` |
| `search` | string | Search in name/address/district | `sunrise` |

**Example Request:**
```
GET /api/properties?district=Quận 1&minPrice=500000&maxPrice=2000000&minStar=3
```

**Success Response (200):**
```json
[
  {
    "id": 1,
    "hotelname": "Grand Saigon Hotel",
    "address": "123 Nguyen Hue Street",
    "street": "Nguyen Hue",
    "district": "Quận 1",
    "city": "Hồ Chí Minh",
    "lat": 10.7769,
    "lon": 106.7009,
    "categoryName": "Hotel",
    "categories": ["Hotel", "Luxury"],
    "description1": "Luxury hotel in the heart of Saigon",
    "description2": "5-star amenities with stunning city views",
    "url_google": "https://maps.google.com/...",
    "website": "https://grandhotel.com",
    "phone": "+84 28 1234 5678",
    "price": 1500000,
    "imageUrl": "https://example.com/hotel1.jpg",
    "star": 5,
    "rank": 1,
    "totalScore": 4.8,
    "reviewsCount": 250,
    "amenities": ["WiFi", "Pool", "Gym", "Spa", "Restaurant"],
    "reviews": ["Excellent service!", "Great location!"]
  },
  ...
]
```

**Error Response:**
- `500 Internal Server Error`
  ```json
  { "message": "Failed to fetch hotels" }
  ```

---

### Search Properties

Advanced search across multiple fields.

**Endpoint:** `GET /api/properties/search`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search term |

**Example Request:**
```
GET /api/properties/search?query=sunrise
```

**Success Response (200):**
```json
[
  {
    "id": 5,
    "hotelname": "Sunrise Hotel",
    "district": "Quận 3",
    "price": 800000,
    ...
  },
  {
    "id": 12,
    "hotelname": "Sunrise Homestay",
    "district": "Thủ Đức",
    "price": 450000,
    ...
  }
]
```

**Error Responses:**
- `400 Bad Request` - Missing query parameter
  ```json
  { "message": "Query parameter is required." }
  ```
- `500 Internal Server Error`
  ```json
  { "message": "Failed to search hotels" }
  ```

---

### Get Property by ID

Retrieves details of a specific hotel.

**Endpoint:** `GET /api/properties/:id`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Hotel ID |

**Example Request:**
```
GET /api/properties/42
```

**Success Response (200):**
```json
{
  "id": 42,
  "hotelname": "Ocean View Hotel",
  "address": "789 Vo Van Kiet Street",
  "district": "Quận 5",
  "price": 1200000,
  "star": 4,
  "amenities": ["WiFi", "Pool", "Restaurant"],
  ...
}
```

**Error Responses:**
- `400 Bad Request` - Invalid ID format
  ```json
  { "message": "Invalid hotel ID" }
  ```
- `404 Not Found` - Hotel doesn't exist
  ```json
  { "message": "Hotel not found." }
  ```
- `500 Internal Server Error`
  ```json
  { "message": "Failed to fetch hotel details" }
  ```

---

### Get Properties by District

Retrieves all hotels in a specific district.

**Endpoint:** `GET /api/properties/district/:district`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `district` | string | District name |

**Example Request:**
```
GET /api/properties/district/Quận 1
```

**Success Response (200):**
```json
[
  {
    "id": 1,
    "hotelname": "Grand Saigon Hotel",
    "district": "Quận 1",
    ...
  },
  {
    "id": 8,
    "hotelname": "Central Hotel",
    "district": "Quận 1",
    ...
  }
]
```

**Error Response:**
- `500 Internal Server Error`
  ```json
  { "message": "Failed to fetch hotels by district" }
  ```

---

### Add Review to Property

Adds a new review to a hotel (mock implementation).

**Endpoint:** `POST /api/properties/:id/reviews`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Hotel ID |

**Request Body:**
```json
{
  "rating": 4.5,
  "comment": "Great hotel with excellent service!"
}
```

**Success Response (201):**
```json
{
  "message": "Review added successfully",
  "review": {
    "hotelId": 42,
    "rating": 4.5,
    "comment": "Great hotel with excellent service!",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid ID
  ```json
  { "message": "Invalid hotel ID" }
  ```
- `400 Bad Request` - Missing fields
  ```json
  { "message": "Rating and comment are required" }
  ```
- `404 Not Found` - Hotel doesn't exist
  ```json
  { "message": "Hotel not found." }
  ```
- `500 Internal Server Error`
  ```json
  { "message": "Failed to add review" }
  ```

**Note:** This is a mock endpoint. Reviews are not persisted to the CSV file.

---

## 💬 Chat Routes

### Chat with AI Bot

Send a message to the AI chatbot and receive hotel recommendations.

**Endpoint:** `POST /api/chat`

**Request Body:**
```json
{
  "message": "Tôi cần tìm khách sạn giá rẻ ở Quận 1",
  "history": [
    {
      "role": "user",
      "content": "Xin chào"
    },
    {
      "role": "assistant",
      "content": "Xin chào! Tôi có thể giúp gì cho bạn?"
    }
  ]
}
```

**Request Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | User's message |
| `history` | array | No | Previous conversation (not currently used) |

**Success Response (200):**
```json
{
  "response": "Tôi tìm thấy 5 khách sạn phù hợp:\n\n1. **Budget Hotel Saigon**\n   📍 Quận 1\n   💰 0.6 triệu VND/đêm\n   ⭐ 3 sao\n\n2. **Sunrise Homestay**\n   📍 Quận 1\n   💰 0.4 triệu VND/đêm\n   ⭐ N/A sao\n\n...\n\nBạn muốn biết thêm thông tin về khách sạn nào?",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Chatbot Capabilities:**

The chatbot can understand:
- **Greetings:** "Xin chào", "Hello", "Hi"
- **Help requests:** "Giúp tôi", "Làm gì được", "Hỗ trợ"
- **Location keywords:** "Quận 1", "Quận 3", "Thủ Đức", etc.
- **Price keywords:** 
  - Budget: "rẻ", "giá tốt", "bình dân" (< 1,000,000 VND)
  - Luxury: "cao cấp", "sang trọng" (> 2,000,000 VND)
- **Search terms:** "Tìm khách sạn", "Homestay"

**Example Messages:**
```
"Tìm khách sạn giá rẻ ở Quận 1"
→ Returns budget hotels in District 1

"Khách sạn cao cấp ở Thủ Đức"
→ Returns luxury hotels in Thu Duc

"Xin chào"
→ Returns greeting message

"Giúp tôi"
→ Returns list of capabilities
```

**Error Responses:**
- `400 Bad Request` - Missing message
  ```json
  { "error": "Message is required" }
  ```
- `500 Internal Server Error`
  ```json
  {
    "error": "Failed to process chat message",
    "response": "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau."
  }
  ```

---

## 🗂️ Data Models

### Hotel Object

```typescript
{
  id: number;                    // Unique identifier
  hotelname: string;             // Hotel name
  address: string;               // Full address
  street: string;                // Street name
  district: string;              // District (e.g., "Quận 1")
  city: string;                  // City (e.g., "Hồ Chí Minh")
  lat: number;                   // Latitude
  lon: number;                   // Longitude
  searchString: string;          // Combined search text
  categoryName: string;          // Category (Hotel, Homestay, etc.)
  categories: string[];          // Array of categories
  description1?: string;         // Primary description
  description2?: string;         // Secondary description
  url_google?: string;           // Google Maps URL
  website?: string;              // Hotel website
  phone?: string;                // Contact number
  price: number;                 // Price per night (VND)
  imageUrl?: string;             // Main image URL
  star: number;                  // Star rating (1-5)
  rank?: number;                 // Ranking position
  totalScore?: number;           // Average review score
  oneStar?: number;              // Count of 1-star reviews
  twoStar?: number;              // Count of 2-star reviews
  threeStar?: number;            // Count of 3-star reviews
  fourStar?: number;             // Count of 4-star reviews
  fiveStar?: number;             // Count of 5-star reviews
  reviewsCount?: number;         // Total reviews
  amenities?: string[];          // List of amenities
  reviews?: string[];            // Review texts
  alln?: string;                 // Additional data
}
```

### User Object

```typescript
{
  id: number;           // Unique user ID
  email: string;        // Email address
  password: string;     // Hashed password (never sent to client)
  name: string;         // Full name
}
```

### Review Object

```typescript
{
  id: number;           // Unique review ID
  hotelId: number;      // Associated hotel ID
  rating: number;       // Rating (1-5)
  comment: string;      // Review text
  createdAt: string;    // ISO timestamp
}
```

---

## 📊 Response Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication failed |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 500 | Internal Server Error | Server-side error |

---

## 🔧 Testing the API

### Using cURL

**Get all hotels:**
```bash
curl http://localhost:5000/api/properties
```

**Search hotels:**
```bash
curl "http://localhost:5000/api/properties/search?query=sunrise"
```

**Register user:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123","name":"Test User"}'
```

**Chat with AI:**
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Tìm khách sạn ở Quận 1"}'
```

### Using Postman

1. Import this collection: [Download Postman Collection](#)
2. Set base URL to `http://localhost:5000/api`
3. Test each endpoint

### Using Browser

**Get all hotels:**
```
http://localhost:5000/api/properties
```

**Search:**
```
http://localhost:5000/api/properties/search?query=hotel
```

**Get by ID:**
```
http://localhost:5000/api/properties/1
```

---

## 🔐 CORS Configuration

The API allows cross-origin requests from any domain. In production, restrict this:

```typescript
// backend/src/index.ts
app.use(cors({
  origin: 'https://yourdomain.com',  // Only allow your frontend
  credentials: true
}));
```

---

## 📝 Notes

### Current Limitations

1. **No Real Database:** Data is stored in CSV, not persisted
2. **No Authentication Tokens:** Sessions are in-memory only
3. **No Review Persistence:** Reviews are not saved
4. **Simple AI:** Keyword-based, not real NLP
5. **No Pagination:** All results returned at once

### Future Enhancements

- Add JWT authentication
- Migrate to MongoDB or PostgreSQL
- Implement real AI with OpenAI/Gemini API
- Add pagination and sorting
- Implement caching with Redis
- Add rate limiting
- Create API versioning (e.g., `/api/v1/`)

---

**Version:** 1.0.0  
**Last Updated:** January 2024  
**Contact:** support@3t2m1stay.vn
