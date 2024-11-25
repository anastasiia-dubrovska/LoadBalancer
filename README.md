# LoadBalancer

## Description
This project is a multi-server web application with a load balancer designed to efficiently handle high volumes of requests. It provides a secure and scalable architecture, enabling seamless user authentication, interaction, and server communication. The project supports HTTPS for secure connections and follows modular design principles.

### Key Features
- **Load Balancer**: A custom logic to evenly distribute incoming requests to multiple servers, ensuring scalability and reliability.
- **Multi-server Architecture**: Three additional servers (`server1.js`, `server2.js`, `server3.js`) complement the main server (`server.js`) to handle heavy workloads.
- **Authentication System**: Includes login and registration pages with separate flows for authenticated and unauthenticated users.
- **Admin Dashboard**: A management panel for authorized users, providing a secure space to monitor and interact with the system.

## Project Structure
- **Backend:**
  - `server.js`: Main server handling core logic.
  - `server1.js`, `server2.js`, `server3.js`: Auxiliary servers for handling distributed tasks.
  - `loadBalancer.js`: Implements request distribution logic.
- **Frontend:**
  - `index.html`: Homepage for authenticated users.
  - `indexNoLogin.html`: Homepage for unauthenticated users.
  - `login.html`: Login interface.
  - `signUp.html`: Registration interface for new users.
  - `panel.html`: Admin dashboard for managing user data and server statuses.
- **Certificates:**
  - `https/`: Contains SSL certificates for secure HTTPS connections.


## Requirements
- **Node.js**: Version 16 or higher.
- **NPM**: For managing dependencies.


