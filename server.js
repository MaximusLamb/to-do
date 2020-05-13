require('dotenv').config();

const client = require('./lib/client');

// Initiate database connection
client.connect();

const app = require('./lib/app');

const PORT = process.env.PORT || 7890;

const ensureAuth = require('./lib/auth/ensure-auth');
const createAuthRoutes = require('./lib/auth/create-auth-routes');


const authRoutes = createAuthRoutes({
  selectUser(email) {
    return client.query(`
            SELECT id, email, hash 
            FROM users
            WHERE email = $1;
        `,
    [email]
    ).then(result => result.rows[0]);
  },
  insertUser(user, hash) {
    console.log(user);
    return client.query(`
            INSERT into users (email, hash)
            VALUES ($1, $2)
            RETURNING id, email;
        `,
    [user.email, hash]
    ).then(result => result.rows[0]);
  }
});


// setup authentication routes to give user an auth token
// creates a /signin and a /signup route. 
// each requires a POST body with a .email and a .password
app.use('/api/auth', authRoutes);

// everything that starts with "/api" below here requires an auth token!
app.use('/api', ensureAuth);

app.get('/api/test', (req, res) => {
  res.json({
    message: `in this proctected route, we get the user's id like so: ${req.userId}`
  });
});

app.get('/api/todo', async(req, res) => {
  const data = await client.query('SELECT * from todo');

  res.json(data.rows);
});

app.post('/api/new', async(req, res) => {

  try {
    const data = await client.query(`INSERT into todo (todo, completed, owner_id)
  values ($1, $2, $3)
  RETURNING *`,
    [req.body.todo, req.body.completed, req.body.owner_id]);

    res.json(data.rows[0]);
  } catch(e) {
    console.log(e);
    res.json(e);
  }
});

app.put('/api/todo/:id', async(req, res) => {
  
  const data = await client.query(
    `UPDATE todo 
    SET completed = true 
    WHERE id = $1 AND owner_id = $2
    RETURNING *`, 
    [(req.params.id), req.body.owner_id]);
   
  res.json(data.rows);
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Started on ${PORT}`);
});

module.exports = app;
