# AuraSales | Performance Management Web Application

AuraSales is a state-of-the-art Sales Performance Management Application designed for administrators and sales representatives. It utilizes **Next.js (App Router)** as the web framework, **Supabase** for database logic and authentication, and **Vanilla CSS** for premium, high-fidelity responsive glassmorphic interfaces.

---

## Key Features

- **Double-Sided Dashboard**: 
  - **Admin**: Monitor live organization revenue, review sales submissions (approval queues), edit representative monthly sales targets, register new operator accounts, and analyze distribution trends via dynamic Chart.js charts.
  - **Employee**: Log new closed sales, view log history status updates, monitor monthly quota completions via interactive circular target gauges, and view standings rankings in a gamified leaderboard.
- **Client-Side SPA Architecture**: Seamless UI switches based on user authentication state and authorization role.
- **Real-Time Data Streaming**: Automatic data refreshes on database tables changes utilizing Supabase Postgres real-time listeners.
- **Aesthetic Vanilla CSS Theme**: Dark mode design system containing glowing inputs, frosted glass containers, smooth page-switch fade animations, and micro-interactions.

---

## Getting Started

### 1. Database Setup (Supabase)

To link the application with your database, configure the schema and Row-Level Security rules:

1. Log in to your [Supabase Console](https://supabase.com).
2. Open your project, click on the **SQL Editor** in the left sidebar, and click **New Query**.
3. Paste the contents of [supabase_schema.sql](file:///e:/projects/sales_mangement/supabase_schema.sql) into the editor.
4. Click **Run** to execute the script. This creates:
   - The `profiles` table to store metadata (full name, target quota, role).
   - The `sales` table to store logged sales transactions.
   - An database trigger (`handle_new_user`) that synchronizes new registrations in Supabase Auth automatically with the `profiles` table.
   - RLS security policies that allow users to inspect their own sales, and admins to approve or adjust records.

### 2. Environment Variables Configuration

The environment variable file `.env.local` contains the Supabase public API endpoints:

```env
NEXT_PUBLIC_SUPABASE_URL=https://grxuahuuigatdyflcasf.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_HfV9btf2U1QOxfNycuyyeA_u6kwTom_
```

### 3. Installation & Run Local Server

Install standard dependencies and start the Next.js development server:

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## Mock Demonstration Accounts

To help you review and test the system immediately, you can use the **Create Account** tab on the login screen to register test accounts. Alternatively, you can prefill inputs by clicking the quick-buttons under "Reviewer Demo Accounts":

### 1. Admin Account (Test Multi-Admin capability)
- **Role**: Administrator
- **Email**: `admin@demo.com`
- **Password**: `admin123`
*(Note: Create this account under the "Create Account" tab with the Administrator role selected if it does not already exist).*

### 2. Employee Account (Test target tracker and leaderboard standings)
- **Role**: Employee
- **Email**: `employee@demo.com`
- **Password**: `employee123`
*(Note: Create this account under the "Create Account" tab with the Employee role selected if it does not already exist).*

---

## Project Structure

```
e:/projects/sales_mangement/
├── src/
│   ├── app/
│   │   ├── globals.css      # Core Vanilla CSS design variables, styles & animations
│   │   ├── layout.js        # Root HTML layout and SEO meta configuration
│   │   └── page.js          # Authentication observers, SPA page routing
│   ├── components/
│   │   ├── AdminDashboard.js # Performance dashboard, approvals list, target manager
│   │   ├── EmployeeDashboard.js # Sales forms logger, quota circular progress gauge, leaderboard
│   │   ├── Login.js         # Authentication forms, signup tabs, demo account presets
│   │   └── Toast.js         # Slide-in global alert notification banners
│   └── lib/
│       └── supabase.js      # Supabase client credentials initialization
├── .env.local               # Public Supabase credentials config
├── supabase_schema.sql      # Database tables, triggers, and RLS policies SQL
├── package.json             # NPM package scripts & library dependencies
└── README.md                # Documentation guide
```
