const request = require("supertest");
const app = require("../server");

describe("Rotas de tarefas", () => {
  let token;

  beforeAll(async () => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const user = {
      name: "Usuário de teste",
      username: `jest_tasks_${id}`,
      email: `jest_tasks_${id}@example.test`,
      password: "password123",
    };

    const register = await request(app).post("/api/auth/register").send(user);
    expect(register.statusCode).toBe(201);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ username: user.username, password: user.password });
    expect(login.statusCode).toBe(200);
    token = login.body.token;
  });

  it("recusa acesso sem token", async () => {
    const response = await request(app).get("/api/tasks");

    expect(response.statusCode).toBe(401);
  });

  it("retorna a lista de tarefas do usuário autenticado", async () => {
    const response = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("recusa um token inválido", async () => {
    const response = await request(app)
      .get("/api/tasks")
      .set("Authorization", "Bearer token-invalido");

    expect(response.statusCode).toBe(401);
  });
});
