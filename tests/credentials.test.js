require('./setup');
const request = require('supertest');
const { app, startServer, stopServer } = require('../src/server');

let server;
let agent;

const testUser = {
  email: 'cred-test@example.com',
  masterPassword: 'CredTestPass123!',
};

beforeAll(async () => {
  server = await startServer();
  agent = request.agent(app);

  // Register and login
  await agent.post('/api/auth/register').send(testUser);
  await agent.post('/api/auth/login').send(testUser);
});

afterAll(async () => {
  await stopServer();
});

describe('Credentials API', () => {
  let credentialId;

  test('POST /api/credentials - creates a credential', async () => {
    const res = await agent
      .post('/api/credentials')
      .send({
        siteName: 'GitHub',
        url: 'https://github.com',
        username: 'testuser',
        password: 'MyGitHubPass!123',
        notes: 'My GitHub account',
      })
      .expect(201);

    expect(res.body.id).toBeTruthy();
    expect(res.body.siteName).toBe('GitHub');
    credentialId = res.body.id;
  });

  test('GET /api/credentials - lists credentials', async () => {
    const res = await agent.get('/api/credentials').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);

    const cred = res.body.find(c => c.id === credentialId);
    expect(cred).toBeTruthy();
    expect(cred.siteName).toBe('GitHub');
    expect(cred.password).toBe('MyGitHubPass!123'); // Decrypted
  });

  test('GET /api/credentials/:id - gets single credential', async () => {
    const res = await agent.get(`/api/credentials/${credentialId}`).expect(200);

    expect(res.body.siteName).toBe('GitHub');
    expect(res.body.password).toBe('MyGitHubPass!123');
    expect(res.body.username).toBe('testuser');
  });

  test('PUT /api/credentials/:id - updates a credential', async () => {
    await agent
      .put(`/api/credentials/${credentialId}`)
      .send({ siteName: 'GitHub Enterprise', password: 'NewPass!456' })
      .expect(200);

    const res = await agent.get(`/api/credentials/${credentialId}`).expect(200);
    expect(res.body.siteName).toBe('GitHub Enterprise');
    expect(res.body.password).toBe('NewPass!456');
  });

  test('GET /api/credentials/search?q= - searches credentials', async () => {
    const res = await agent.get('/api/credentials/search?q=GitHub').expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].siteName).toContain('GitHub');
  });

  test('POST /api/credentials - detects duplicates', async () => {
    const res = await agent
      .post('/api/credentials')
      .send({
        siteName: 'GitHub Dupe',
        url: 'https://github.com',
        username: 'testuser',
        password: 'AnotherPass!789',
      })
      .expect(409);

    expect(res.body.error).toContain('already exists');
  });

  test('DELETE /api/credentials/:id - deletes a credential', async () => {
    await agent.delete(`/api/credentials/${credentialId}`).expect(200);

    await agent.get(`/api/credentials/${credentialId}`).expect(404);
  });

  test('GET /api/credentials/:id - returns 404 for non-existent', async () => {
    await agent.get('/api/credentials/non-existent-id').expect(404);
  });
});

describe('Categories API', () => {
  let categoryId;

  test('POST /api/categories - creates a category', async () => {
    const res = await agent
      .post('/api/categories')
      .send({ name: 'Social Media' })
      .expect(201);

    expect(res.body.id).toBeTruthy();
    expect(res.body.name).toBe('Social Media');
    categoryId = res.body.id;
  });

  test('GET /api/categories - lists categories', async () => {
    const res = await agent.get('/api/categories').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /api/categories - rejects duplicate name', async () => {
    await agent
      .post('/api/categories')
      .send({ name: 'Social Media' })
      .expect(409);
  });

  test('PUT /api/categories/:id - updates a category', async () => {
    await agent
      .put(`/api/categories/${categoryId}`)
      .send({ name: 'Social Networks' })
      .expect(200);
  });

  test('DELETE /api/categories/:id - deletes a category', async () => {
    await agent.delete(`/api/categories/${categoryId}`).expect(200);
  });
});

describe('Password Generator API', () => {
  test('POST /api/generate-password - generates with defaults', async () => {
    const res = await agent
      .post('/api/generate-password')
      .send({})
      .expect(200);

    expect(res.body.password).toBeTruthy();
    expect(res.body.password.length).toBe(16);
    expect(res.body.strength).toBeTruthy();
    expect(res.body.strength.label).toBeTruthy();
  });

  test('generates with custom length', async () => {
    const res = await agent
      .post('/api/generate-password')
      .send({ length: 32 })
      .expect(200);

    expect(res.body.password.length).toBe(32);
  });

  test('generates with only lowercase', async () => {
    const res = await agent
      .post('/api/generate-password')
      .send({ length: 20, uppercase: false, digits: false, symbols: false })
      .expect(200);

    expect(res.body.password).toMatch(/^[a-z]+$/);
  });

  test('rejects length below 4', async () => {
    await agent
      .post('/api/generate-password')
      .send({ length: 2 })
      .expect(400);
  });
});

describe('CSV Import/Export', () => {
  test('Export returns CSV', async () => {
    // Create a credential first
    await agent.post('/api/credentials').send({
      siteName: 'ExportTest',
      url: 'https://export.test',
      username: 'exportuser',
      password: 'ExportPass123!',
      notes: 'export test',
    });

    const res = await agent.get('/api/credentials/export').expect(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('site_name');
    expect(res.text).toContain('ExportTest');
  });

  test('Import CSV data', async () => {
    const csvData = `site_name,url,username,password,notes,category
ImportSite,https://import.test,importuser,ImportPass123!,imported note,ImportCategory`;

    const res = await agent
      .post('/api/credentials/import')
      .send({ csvData })
      .expect(200);

    expect(res.body.imported).toBe(1);

    // Verify it was imported
    const creds = await agent.get('/api/credentials').expect(200);
    const imported = creds.body.find(c => c.siteName === 'ImportSite');
    expect(imported).toBeTruthy();
    expect(imported.password).toBe('ImportPass123!');
  });
});
