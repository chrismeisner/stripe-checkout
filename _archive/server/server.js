// server.js
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Load secret key from .env
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors()); // Enable cross-origin requests
app.use(bodyParser.json()); // Parse JSON body

app.post('/create-checkout-session', async (req, res) => {
  const { price } = req.body; // Get the dynamic price sent from frontend

  try {
	const session = await stripe.checkout.sessions.create({
	  payment_method_types: ['card'],
	  line_items: [
		{
		  price_data: {
			currency: 'usd',
			product_data: {
			  name: 'Service Payment', // Generic name for now
			},
			unit_amount: Math.round(price * 100), // Stripe expects amounts in cents
		  },
		  quantity: 1,
		},
	  ],
	  mode: 'payment',
	  success_url: `${process.env.CLIENT_URL}/success`,
	  cancel_url: `${process.env.CLIENT_URL}/cancel`,
	});

	res.json({ id: session.id }); // Send session ID to the frontend
  } catch (error) {
	console.error('Error creating checkout session:', error);
	res.status(500).json({ error: 'Failed to create Stripe session' });
  }
});

app.listen(3000, () => console.log('Server is running on port 3000'));
