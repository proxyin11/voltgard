require('./setup');
const request = require('supertest');
const { app, startServer, stopServer } = require('../src/server');

let server;

beforeAll(async () => {
  server = await startServer();
});

afterAll(async () => {
  await stopServer();
});

describe('Auth API', () => {
  const testUser = {
    email: 'test@example.com',
    masterPassword: 'TestPassword123!',
  };

  describe('POST /api/auth/register', () => {
    test('registers a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body.message).toContain('Registration successful');
    });

    test('rejects duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);

      expect(res.body.error).toContain('already exists');
    });

    test('rejects short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'short@test.com', masterPassword: '123' })
        .expect(400);

      expect(res.body.error).toContain('Validation');
    });

    test('rejects invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', masterPassword: 'ValidPass123!' })
        .expect(400);

      expect(res.body.error).toContain('Validation');
    });
  });

  describe('POST /api/auth/login', () => {
    test('logs in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send(testUser)
        .expect(200);

      expect(res.body.message).toContain('Login successful');
      expect(res.body.email).toBe(testUser.email);
    });

    test('rejects wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, masterPassword: 'WrongPassword123!' })
        .expect(401);

      expect(res.body.error).toContain('Invalid');
    });

    test('rejects non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', masterPassword: 'SomePass123!' })
        .expect(401);

      expect(res.body.error).toContain('Invalid');
    });
  });

  describe('GET /api/auth/status', () => {
    test('returns not authenticated without session', async () => {
      const res = await request(app)
        .get('/api/auth/status')
        .expect(200);

      expect(res.body.authenticated).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    test('logout works with agent', async () => {
      const agent = request.agent(app);

      // Login first
      await agent.post('/api/auth/login').send(testUser).expect(200);

      // Logout
      const res = await agent.post('/api/auth/logout').expect(200);
      expect(res.body.message).toContain('Logged out');

      // Status should be not authenticated
      const status = await agent.get('/api/auth/status').expect(200);
      expect(status.body.authenticated).toBe(false);
    });
  });

  describe('SSO Endpoints', () => {
    test('POST /api/auth/sso/google authenticates Google user', async () => {
      const res = await request(app)
        .post('/api/auth/sso/google')
        .send({ email: 'sso.google@example.com' })
        .expect(200);

      expect(res.body.message).toContain('Google SSO authentication successful');
      expect(res.body.email).toBe('sso.google@example.com');
    });

    test('POST /api/auth/sso/apple authenticates Apple user', async () => {
      const res = await request(app)
        .post('/api/auth/sso/apple')
        .send({ email: 'sso.apple@privaterelay.appleid.com' })
        .expect(200);

      expect(res.body.message).toContain('Apple SSO authentication successful');
      expect(res.body.email).toBe('sso.apple@privaterelay.appleid.com');
    });
  });
});

describe('Protected Routes (without auth)', () => {
  test('GET /api/credentials returns 401', async () => {
    await request(app).get('/api/credentials').expect(401);
  });

  test('GET /api/categories returns 401', async () => {
    await request(app).get('/api/categories').expect(401);
  });
});
