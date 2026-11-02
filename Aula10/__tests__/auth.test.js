const request = require("supertest");
const app = require("../server");

describe("Autenticação", () => {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const user = {
    name: "Usuário de teste",
    username: `jest_${id}`,
    email: `jest_${id}@example.test`,
    password: "password123",
  };

  it("registra um usuário e retorna os dados públicos", async () => {
    const response = await request(app).post("/api/auth/register").send(user);

    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject({
      name: user.name,
      username: user.username,
      email: user.email,
    });
    expect(response.body).toHaveProperty("id");
    expect(response.body).not.toHaveProperty("password");
  });

  it("faz login e retorna um JWT", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: user.username, password: user.password });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("token");
  });

  it("recusa login com senha incorreta", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: user.username, password: "senha-incorreta" });

    expect(response.statusCode).toBe(401);
  });
});
