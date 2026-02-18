# Xeku Admin Panel

A modern admin panel for managing users, devices, and notifications in the Xeku microservices ecosystem.

## Features

- 🔐 User Authentication
- 📊 Dashboard with Statistics
- 📱 Device Management
  - View all devices
  - Monitor device status
  - Block/unblock devices
  - View device details
- 👥 User Management
  - View all users
  - Block/unblock users
  - View user details and associated devices
- 🔔 Notification Management
  - Send push notifications
  - Target specific users or devices
  - View notification history
  - Track notification status

## Tech Stack

- React 18 with TypeScript
- Material-UI (MUI) for UI components
- Redux Toolkit for state management
- React Query for API data fetching
- React Router for navigation
- Socket.IO client for WebSocket
- Axios for HTTP requests
- Vite for build tool

## Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Running instances of:
  - Auth Service
  - Notification Service
  - User Service
  - Gateway Service

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/xeku-microservices.git
   cd xeku-microservices/services/admin-panel
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```env
   VITE_API_URL=http://localhost:8080/api
   VITE_WS_URL=ws://localhost:8080/ws
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── store/         # Redux store and slices
├── services/      # API services
├── theme/         # MUI theme configuration
└── types/         # TypeScript type definitions
```

## API Integration

The admin panel integrates with the following microservices:

- Auth Service: User authentication and authorization
- Notification Service: Push notification management
- User Service: User management
- Device Service: Device management

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
