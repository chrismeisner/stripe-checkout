const express = require('express');
const Stripe = require('stripe');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.static('public'));
app.use(bodyParser.json());

app.post('/create-checkout-session', async (req, res) => {
  const { serviceName, totalPrice, startDate, isRecurring, customerEmail } = req.body;

  try {
	// Create or retrieve customer
	const customer = await stripe.customers.create({ email: customerEmail });

	// Calculate total amount in cents
	const totalAmountInCents = Math.round(totalPrice * 100);

	// Add an upfront charge (invoice item)
	await stripe.invoiceItems.create({
	  customer: customer.id,
	  amount: totalAmountInCents,
	  currency: 'usd',
	  description: `Upfront charge for ${serviceName}`,
	});

	if (isRecurring) {
	  // Create a product and price for the subscription
	  const product = await stripe.products.create({ name: `${serviceName} Subscription` });

	  const price = await stripe.prices.create({
		unit_amount: totalAmountInCents,
		currency: 'usd',
		recurring: { interval: 'week' },
		product: product.id,
	  });

	  // Create subscription session
	  const session = await stripe.checkout.sessions.create({
		payment_method_types: ['card'],
		customer: customer.id,
		line_items: [{ price: price.id, quantity: 1 }],
		mode: 'subscription',
		subscription_data: {
		  billing_cycle_anchor: Math.floor(new Date(startDate).getTime() / 1000),
		},
		success_url: 'http://localhost:3000/success',
		cancel_url: 'http://localhost:3000/cancel',
	  });

	  res.json({ sessionId: session.id });
	} else {
	  res.json({ message: 'One-time payment collected, no subscription created.' });
	}
  } catch (error) {
	console.error('Error creating checkout session:', error);
	res.status(500).send('Internal Server Error');
  }
});

app.listen(3000, () => console.log('Server is running on http://localhost:3000'));
