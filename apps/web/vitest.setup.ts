// The eager db singleton (server/db.ts) reads DATABASE_URL at import. Tests
// never open a connection, so a non-routable placeholder is enough when the
// var is unset (local runs). CI sets its own dummy and Vercel the real value;
// `??=` leaves either in place.
process.env.DATABASE_URL ??=
  "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder";

// Constructing the BetterAuth instance (imported transitively via the tRPC
// init) reads BETTER_AUTH_SECRET; a dummy keeps tests quiet without a real
// secret. Tests never sign anything, so the value is irrelevant.
process.env.BETTER_AUTH_SECRET ??= "test-secret-not-used-for-anything-1234567890";
