const express = require('express');
const app = express();

// Load environment variables from .env in development and production
require('dotenv').config();

// Log the current environment
console.log(`Application is running in ${process.env.NODE_ENV || 'development'} mode.`);

// Use the Stripe Secret Key from environment variables
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files from the current directory

app.get('/', (req, res) => {
  console.log('Index.html is being served.');
  res.sendFile(__dirname + '/index.html');
});

app.post('/create-checkout-session', async (req, res) => {
  try {
	const { amount, recurring, summary, startDate, serviceName } = req.body; // Capture the service name, summary, and start date from the request body

	// Calculate the trial period based on the start date
	const today = new Date();
	const selectedDate = new Date(startDate); // Start date from the frontend
	let trialPeriodDays = Math.round((selectedDate - today) / (1000 * 60 * 60 * 24)); // Calculate the days between today and the selected start date

	// Ensure trialPeriodDays is non-negative
	if (trialPeriodDays < 0) {
	  trialPeriodDays = 0;
	}

	// Create a new Checkout Session for the order
	let sessionParams = {
	  payment_method_types: ['card'],
	  line_items: [{
		price_data: {
		  currency: 'usd',
		  unit_amount: Math.round(amount * 100), // amount in cents
		  product_data: {
			name: serviceName, // Dynamically set the service name
			description: summary, // Add summary to be displayed on the checkout page
		  },
		},
		quantity: 1,
	  }],
	  mode: 'payment',
	  success_url: `${req.headers.origin}/success.html`,
	  cancel_url: `${req.headers.origin}/cancel.html`,
	  metadata: {
		summary: summary, // Keep it in metadata for internal reference
	  },
	};

	// If recurring is true, set up a subscription
	if (recurring) {
	  sessionParams.mode = 'subscription';
	  sessionParams.line_items[0].price_data.recurring = {
		interval: 'week',
		interval_count: 1,
	  };

	  // Add the trial period for the subscription
	  if (trialPeriodDays > 0) {
		sessionParams.subscription_data = {
		  trial_period_days: trialPeriodDays, // Set the trial period in days
		};
	  }
	}

	const session = await stripe.checkout.sessions.create(sessionParams);

	res.json({ id: session.id });
  } catch (error) {
	console.error(error);
	res.status(500).json({ error: error.message });
  }
});

// Bind to the correct port for Heroku or local development
const port = process.env.PORT || 4242;
app.listen(port, () => {
  console.log(`Running on port ${port}`);
});