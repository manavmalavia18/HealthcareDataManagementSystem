# Healthcare Data Management System

This project implements a Healthcare Data Management System, providing RESTful APIs for managing healthcare plans.

## Features

- **Authentication**: Utilizes Google OAuth2 for user authentication.
- **Data Validation**: Validates request data against JSON schemas.
- **ETag Support**: Implements ETag-based caching to optimize data retrieval.
- **CRUD Operations**: Supports Create, Read, Update, and Delete operations for healthcare plans.

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/your/repository.git
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. **Set up Redis server**: Ensure Redis is installed and running on `127.0.0.1:6379`.

4. Configure Google OAuth2 credentials in the code.

## Usage

1. Start the server:

    ```bash
    npm start
    ```

2. The server will run on `http://localhost:3000` by default.

## Endpoints

### Create Plan

- **URL**: `/v1/plan`
- **Method**: `POST`
- **Request Body**: JSON object representing the healthcare plan.
- **Authentication Required**: Yes

### Get Plan

- **URL**: `/v1/plan/:id`
- **Method**: `GET`
- **Parameters**: `id` - The ID of the plan to retrieve.
- **Authentication Required**: Yes

### Update Plan

- **URL**: `/v1/plan/:id`
- **Method**: `PUT`
- **Parameters**: `id` - The ID of the plan to update.
- **Request Body**: Updated JSON object representing the healthcare plan.
- **Authentication Required**: Yes

### Delete Plan

- **URL**: `/v1/plan/:id`
- **Method**: `DELETE`
- **Parameters**: `id` - The ID of the plan to delete.
- **Authentication Required**: Yes

### Patch Plan

