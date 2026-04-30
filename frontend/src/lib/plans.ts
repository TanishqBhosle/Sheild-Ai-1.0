export const PLANS = {
  free:       { name: 'Free',       price: 0,   reqPerMin: 60,    reqPerMonth: 1000,    color: '#6b7a99' },
  starter:    { name: 'Starter',    price: 29,  reqPerMin: 300,   reqPerMonth: 10000,   color: '#f59e0b' },
  pro:        { name: 'Pro',        price: 99,  reqPerMin: 1000,  reqPerMonth: 100000,  color: '#6366f1' },
  enterprise: { name: 'Enterprise', price: 499, reqPerMin: 10000, reqPerMonth: 10000000, color: '#8b5cf6' },
} as const;
