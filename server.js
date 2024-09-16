const express = require('express');
const app = express();
const fetch = require('node-fetch');

// Load environment variables from .env
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(express.static('.')); 

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// API route to get hero content
app.get('/api/hero-content', async (req, res) => {
  try {
	const response = await fetch(`${AIRTABLE_URL}/Copy`, {
	  headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
	});
	const data = await response.json();
	res.json(data);
  } catch (error) {
	console.error('Error fetching hero content:', error);
	res.status(500).json({ error: 'Failed to fetch hero content' });
  }
});

// API route to get service data
app.get('/api/services', async (req, res) => {
  try {
	const response = await fetch(`${AIRTABLE_URL}/Services`, {
	  headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
	});
	const data = await response.json();
	res.json(data);
  } catch (error) {
	console.error('Error fetching services:', error);
	res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Stripe checkout session
app.post('/create-checkout-session', async (req, res) => {
  try {
	const { amount, recurring, serviceName, startDate } = req.body;
	const today = new Date();
	const selectedDate = new Date(startDate);
	let trialPeriodDays = Math.round((selectedDate - today) / (1000 * 60 * 60 * 24));

	trialPeriodDays = trialPeriodDays < 0 ? 0 : trialPeriodDays;

const sessionParams = {
	  payment_method_types: ['card'],
	  line_items: [{
		price_data: {
		  currency: 'usd',
		  unit_amount: Math.round(amount * 100),
		  product_data: { name: serviceName },
		},
		quantity: 1,
	  }],
	  mode: recurring ? 'subscription' : 'payment',
	  success_url: `${req.headers.origin}/success.html`,
	  cancel_url: `${req.headers.origin}/cancel.html`,
	  metadata: {   // Add custom metadata here
		summary: summary,
		startDate: startDate,
		days: days,
		recurring: recurring ? 'Yes' : 'No'
	  },
	};

	if (recurring) {
	  sessionParams.line_items[0].price_data.recurring = {
		interval: 'week',
		interval_count: 1,
	  };

	  if (trialPeriodDays > 0) {
		sessionParams.subscription_data = {
		  trial_period_days: trialPeriodDays,
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

const port = process.env.PORT || 4242;
app.listen(port, () => {
  console.log(`Running on port ${port}`);
});
