import express from "express";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
dotenv.config();

const port = process.env.PORT || 3030;
const app = express();

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://ejp-nextjs-emartbd-client.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_ACCESS}@cluster0.bfqzn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );

    // Connections
    const database = client.db(process.env.DB_NAME);
    const usersCollection = database.collection("users");
    const productsCollection = database.collection("products");

    // READING
    // Get latest products
    app.get("/latest/products", async (req, res) => {
      try {
        const latest = await productsCollection
          .find({})
          .sort({ createdAt: -1 }) // newest first
          .limit(6)
          .toArray();

        res.json(latest);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
    // Get product by ID
    app.get("/products/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const product = await productsCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!product)
          return res.status(404).json({ message: "Product not found" });

        res.json(product);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
    // Get all products
    app.get("/products", async (req, res) => {
      try {
        const allProducts = await productsCollection.find({}).toArray();
        res.json(allProducts);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
    // Get products by user email
    app.get("/products/user/:email", async (req, res) => {
      try {
        const { email } = req.params;

        // Find all products created by this user
        const userProducts = await productsCollection
          .find({ userEmail: email })
          .sort({ createdAt: -1 }) // newest first
          .toArray();

        res.json(userProducts);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });

    // POSTING
    // Register
    app.post("/register", async (req, res) => {
      try {
        const { name, email, password, image } = req.body;
        // Fields check
        if (!name || !email || !password || !image)
          return res.status(400).json({ message: "Some fields are missing" });
        // Exiting user check
        const exist = await usersCollection.findOne({ email });
        if (exist)
          return res.status(400).json({ message: "User already exists" });
        // User object
        const newUser = {
          name,
          email,
          password,
          image: image || "",
          createdAt: new Date(),
        };
        // Insert data
        await usersCollection.insertOne(newUser);

        res.json({ message: "Registered successfully", user: newUser });
      } catch (err) {
        res.status(500).json({ message: "Server error" });
      }
    });
    // Login
    app.post("/login", async (req, res) => {
      try {
        const { email, password } = req.body;
        // find user
        const user = await usersCollection.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });
        // check password
        if (user.password !== password) {
          return res.status(401).json({ message: "Wrong password" });
        }
        // return user
        res.json({ message: "Login success", user });
      } catch (err) {
        res.status(500).json({ message: "Server error" });
      }
    });
    // Products
    app.post("/products", async (req, res) => {
      try {
        const { name, image, description, rating, price, category, userEmail } =
          req.body;

        // Validate required fields
        if (
          !name ||
          !image ||
          !description ||
          !rating ||
          !price ||
          !category ||
          !userEmail
        ) {
          return res.status(400).json({ message: "All fields are required" });
        }

        // Create product object
        const newProduct = {
          name,
          image,
          description,
          rating: Number(rating),
          price: Number(price),
          category,
          userEmail,
          createdAt: new Date(),
        };

        // Insert into products collection
        const result = await productsCollection.insertOne(newProduct);

        res.status(201).json({
          message: "Product added successfully",
          productId: result.insertedId,
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });

    // Delete product by ID
    app.delete("/products/:id", async (req, res) => {
      try {
        const { id } = req.params;

        // Delete the product from the collection
        const result = await productsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Product not found" });
        }

        res.json({ message: "Product deleted successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("E.martBD server");
});

app.listen(port, () => {
  console.log(`E.martBD server listening on port ${port}`);
});
