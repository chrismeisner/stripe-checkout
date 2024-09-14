// server.js

const express = require('express');
const app = express();
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files from current directory

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/create-checkout-session', async (req, res) => {
  try {
	const { amount, recurring, summary } = req.body; // Capture the summary from the request body

	// Create a new Checkout Session for the order
	let sessionParams = {
	  payment_method_types: ['card'],
	  line_items: [{
		price_data: {
		  currency: 'usd',
		  unit_amount: Math.round(amount * 100), // amount in cents
		  product_data: {
			name: 'Service Purchase',
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
	}

	const session = await stripe.checkout.sessions.create(sessionParams);

	res.json({ id: session.id });
  } catch (error) {
	console.error(error);
	res.status(500).json({ error: error.message });
  }
});

app.listen(4242, () => console.log('Running on port 4242'));
