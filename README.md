# CashFlow App

## Overview

The CashFlow App is a web-based tool designed to help users visualize and project their financial cash flow. By integrating with Lunch Money API, it provides an interactive chart to display income, expenses, and future balance projections, helping users make informed financial decisions.

Here are some screenshots of the application in action:
![Main View](images/screenshot_1.png)
![Negative Balance Alerts And Key Events](images/screenshot_2.png)

## Features

- **Interactive Cash Flow Chart**: Visualize your financial trajectory with a dynamic and customizable chart.
- **Projection Horizon Selection**: Adjust the time horizon for your cash flow projections.
- **Key Events Tracking**: Incorporate significant financial events into your projections.
- **Negative Balance Alerts**: Receive timely alerts for potential negative balances.
- **API Key Management**: Securely manage your API keys for financial service integrations.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Ensure you have Node.js and npm (or yarn) installed on your system.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/WesleyCeraso/cashflow-app.git
   ```
2. Navigate to the project directory:
   ```bash
   cd cashflow-app
   ```
3. Install dependencies:
   ```bash
   npm install
   # or yarn install
   ```

### Running the Application

To start the development server:

```bash
npm run dev
# or yarn dev
```

The application will typically be available at `http://localhost:5173`.

### Running Tests

```bash
npm test
```

### Building for Production

To build the application for production:

```bash
npm run build
# or yarn build
```

This will create a `dist` directory with the production-ready files.

## Usage

Upon launching the application, you will be prompted to enter your API key for financial data integration. Once configured, you can select accounts, adjust projection settings, and view your cash flow projections.

The Lunch Money API key is stored in browser `localStorage` under `lm_api_key`. It is not hard-coded in the application and should never be committed.

## Lunch Money v2 Integration

This app uses the Lunch Money v2 API directly from the browser:

- `GET /v2/manual_accounts`
- `GET /v2/plaid_accounts`
- `GET /v2/recurring`, with a fallback to `GET /v2/recurring_items` for live API environments where the migration-guide path returns 404
- `GET /v2/transactions?include_pending=true`

Lunch Money v2 transaction amounts use positive values for debits and negative values for credits. At the API adapter boundary, the app normalizes amounts so the projection engine always uses positive for cash inflow and negative for cash outflow.

Manual and Plaid accounts use separate namespaces, so the app filters by compound account keys such as `manual:123` and `plaid:123`. A selected account projection includes only events explicitly tied to that same account key.

Recurring items are read from the v2 recurring endpoint. The app creates projected recurring events only from missing recurring transaction dates. When Lunch Money has matched a recurring occurrence to an actual or pending transaction, the real transaction is used and the projected duplicate is not applied.

Pending transactions are loaded with `include_pending=true` and included in the cash-flow model. Future-dated real transactions returned by Lunch Money are also included for the selected account.

Local transactions remain browser-only and continue to be managed from the existing Manage Local Transactions modal. They are normalized into the same projection event stream as Lunch Money events and are not written back to Lunch Money.

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Project Link: [https://github.com/WesleyCeraso/cashflow-app](https://github.com/WesleyCeraso/cashflow-app)
