

# Replex 

Replex is a full-stack automation tool that transforms any URL into a high-quality demo reel. It utilizes a headless browser to autonomously navigate, scroll, and interact with web pages, recording the session across multiple responsive viewports (Mobile, Tablet, Desktop) and generating a ready-to-post video.

## Features
*   **Automated UI Recording:** Headless Playwright workers simulate real user behavior (scrolling, clicking random internal links).
*   **Responsive Viewports:** Generates specific video dimensions for iPhone 13, iPad Gen 7, and standard Desktop resolutions.
*   **Asynchronous Processing:** BullMQ and Redis handle intensive video encoding in the background without blocking the UI.
*   **Anonymous Sessions:** No login required. A sticky, anonymous `localStorage` ID keeps user generation history completely private.
*   **Cloud Storage:** Direct-to-Cloudinary uploading with auto-cleanup of local `.webm` files to prevent server memory bloat.

---

## Tech Stack

* **Frontend:** Next.js (React), TypeScript, Tailwind CSS
* **Backend:** Node.js, Express.js, Playwright
* **Database & Queue:** MongoDB (Mongoose), BullMQ, Redis
* **Storage:** Cloudinary

---

## Local Setup Instructions

### Prerequisites

You will need Node.js, a MongoDB cluster URI, a Redis instance URI, and a Cloudinary account.

### 1. Clone & Install

```bash
git clone [https://github.com/just-tara/replex.git](https://github.com/just-tara/replex.git)
cd replex
npm install

```

### 2. Install Playwright Browsers

*Crucial step:* The background worker requires local browser binaries to record the videos.

```bash
npx playwright install chromium

```

### 3. Environment Variables

Create a `.env` file in the root directory and add your credentials:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
REDIS_URL=your_redis_connection_string
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
NEXT_PUBLIC_API_URL=http://localhost:5000

```

### 4. Run the Application

Start the development server and the background worker queue:

```bash
npm run dev

```

---

## API Documentation

All frontend requests must include the `x-user-id` header to associate videos with the anonymous session.

### `POST /generate-video`

Initiates a new Playwright video recording job.

* **Headers:** `x-user-id: <UUID>`
* **Body:** `{ "url": "https://example.com", "device": "mobile" }`
* **Response:** `{ "message": "Video generation started", "jobId": "123" }`

### `GET /job-status/:id`

Polls the BullMQ queue for the real-time status of a recording job.

* **Response:** `{ "id": "123", "state": "active", "progress": 50, "result": null }`

### `GET /api/history`

Fetches the private generation history for the current user.

* **Headers:** `x-user-id: <UUID>`
* **Response:** `Array<VideoRecord>`

### `DELETE /api/history/:id`

Deletes a video record from the database and removes the asset from Cloudinary.

* **Headers:** `x-user-id: <UUID>`

---

## Contribution Guidelines

Contributions, issues, and feature requests are welcome!

1. **Fork the Project**
2. **Create your Feature Branch:** `git checkout -b feature/AmazingFeature`
3. **Commit your Changes:** `git commit -m 'Add some AmazingFeature'`
4. **Push to the Branch:** `git push origin feature/AmazingFeature`
5. **Open a Pull Request**

Please ensure your code adheres to the existing mobile-first design patterns and dark-theme aesthetic before submitting a PR.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact 

**Tara** - [@j_tara_](https://www.google.com/search?q=https://twitter.com/j_tara_)

