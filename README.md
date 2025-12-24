<div align="center">
	<br />
	<p>
		<a href="https://github.com/shuruhatik/hawiah"><img src="https://i.ibb.co/9kNhFwnT/hawiah-npm.png" alt="hawiah" /></a></br>
		<a href="https://www.npmjs.com/package/hawiah"><img src="https://img.shields.io/npm/dt/hawiah?color=50BAA8&style=for-the-badge" alt="NPM Downloads" /></a>
		<a href="https://www.npmjs.com/package/hawiah"><img src="https://img.shields.io/npm/v/hawiah?color=3CB9A7&style=for-the-badge" alt="npm Version" /></a>
		<a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-2E9B8C?style=for-the-badge" alt="License" /></a>
	</p>
</div>

-----
Modular database abstraction with virtual relationships. Support for 7 drivers, 50+ methods, and DataLoader batching. One API to rule them all.

## ✨ Features

- **Universal API** - Same code works with any database
- **Multiple Drivers** - JSON, YAML, SQLite, MongoDB, Firebase, PostgreSQL, MySQL
- **Runtime Agnostic** - Works with Node.js, Bun, and Deno
- **Virtual Relationships** - Define relations between any collections, even across different databases!
- **Hybrid Schema** - Blends SQL tables with NoSQL flexibility (Real columns + JSON)
- **DataLoader Optimization** - Automatic query batching and caching eliminates N+1 problems
- **Extensible** - Create custom drivers for any data source
- **Schema-less / Schema-full** - You choose: Strict validation or total freedom
- **TypeScript Ready** - Full type definitions included

## 📦 Installation

```bash
# Core package (required)
npm install hawiah
# or
bun add hawiah
# or
deno install npm:hawiah

# Choose one or more drivers
npm install @hawiah/local      # JSON & YAML
npm install @hawiah/sqlite     # SQLite
npm install @hawiah/mongo      # MongoDB
npm install @hawiah/firebase   # Firebase Firestore
npm install @hawiah/postgres   # PostgreSQL
npm install @hawiah/mysql      # MySQL
```

**Works with:**
- ✅ Node.js
- ✅ Bun
- ✅ Deno

## 🚀 Quick Start

```javascript
import { Hawiah } from 'hawiah';
import { MongoDriver } from '@hawiah/mongo';

const db = new Hawiah({
  driver: new MongoDriver({
    uri: 'mongodb://localhost:27017',
    databaseName: 'myapp',
    collectionName: 'users'
  })
});

await db.connect();
await db.insert({ id: 1, name: 'John', age: 25 });
const users = await db.get({});
await db.disconnect();
```

Switch to SQLite or Firebase? Just change the driver. Your code stays the same.

## 🧬 The Hybrid Schema System

Hawiah v1.1 introduces a game-changing **Hybrid Schema** capabilities.

### Virtual vs. Real Schemas
How Hawiah handles your schema depends on the driver:

| Feature | SQL Drivers (Postgres, SQLite, MySQL) | NoSQL Drivers (Mongo, Firebase, Local) |
| :--- | :--- | :--- |
| **Logic** | **Real Schema (Physical columns)** | **Virtual Schema (Validator)** |
| **Storage** | Columns for defined fields + JSON for extras. | Full JSON Document. |
| **Benefit** | Native SQL performance & indexing. | Maximum flexibility & speed. |

### Schema Definition
```javascript
import { Schema, DataTypes } from '@hawiah/core';

const userSchema = new Schema({
  // Basic Types
  username: { type: DataTypes.STRING, required: true },
  age:      { type: DataTypes.INTEGER, min: 18 },
  
  // Advanced Types
  email:    { type: DataTypes.EMAIL, unique: true },
  tags:     { type: DataTypes.ARRAY },
  
  // Default Values
  isActive: { type: DataTypes.BOOLEAN, default: true },
  created:  { type: DataTypes.DATE, default: () => new Date() }
});
```

## 🔗 Virtual Relationships - The Game Changer

Define relationships between collections **without foreign keys or schema changes**. Works across different databases!

```javascript
import { Hawiah } from 'hawiah';
import { MongoDriver } from '@hawiah/mongo';
import { SQLiteDriver } from '@hawiah/sqlite';

// Users in MongoDB
const users = new Hawiah({
  driver: new MongoDriver({
    uri: 'mongodb://localhost:27017',
    databaseName: 'myapp',
    collectionName: 'users'
  })
});

// Posts in SQLite
const posts = new Hawiah({
  driver: new SQLiteDriver('./blog.db', 'posts')
});

// Define virtual relationship - MongoDB ↔ SQLite!
users.relation('posts', posts, '_id', 'userId', 'many');
posts.relation('author', users, 'userId', '_id', 'one');

await users.connect();
await posts.connect();

// Query with relationships - automatically optimized!
const usersWithPosts = await users.getWith({}, 'posts');
// Each user includes their posts from SQLite - no N+1 queries!

const postsWithAuthors = await posts.getWith({}, 'author');
// Each post includes author from MongoDB - fully batched!
```

**Why Virtual Relationships are Powerful:**

✨ **Cross-Database Relations** - Connect MongoDB users with SQLite posts, or any combination  
⚡ **Zero N+1 Problems** - DataLoader automatically batches and caches all queries  
🚀 **No Schema Changes** - No foreign keys, no migrations, just pure flexibility  
🎯 **Type-Safe** - Full TypeScript support with proper typing  
🔄 **Nested Relations** - Load relations of relations infinitely  
💪 **Production Ready** - Battle-tested optimization used by GraphQL servers worldwide

## 🗄️ Available Drivers

| Driver | Package | Use Case |
|--------|---------|----------|
| **JSON** | `@hawiah/local` | Development, Testing |
| **YAML** | `@hawiah/local` | Configuration |
| **SQLite** | `@hawiah/sqlite` | Desktop/Mobile Apps |
| **MongoDB** | `@hawiah/mongo` | Web/Cloud Apps |
| **Firebase** | `@hawiah/firebase` | Real-time Apps |
| **PostgreSQL** | `@hawiah/postgres` | Enterprise Apps |
| **MySQL** | `@hawiah/mysql` | Web Apps |
| **Custom** | - | Any Data Source |

## 📚 API Overview

**Basic Operations:** `insert`, `insertMany`, `get`, `getOne`, `getById`, `update`, `updateById`, `remove`, `removeById`, `clear`

**Virtual Relationships:** 
- `relation(name, targetCollection, localKey, foreignKey, type)` - Define virtual relation
- `getWith(query, relations)` - Load data with relations (auto-optimized with DataLoader)

**Advanced:** `sort`, `paginate`, `select`, `count`, `sum`, `group`, `unique`

**Arrays:** `push`, `pull`, `shift`, `unshift`, `pop`

**Fields:** `increment`, `decrement`, `unset`, `rename`

## 📖 Documentation

For detailed documentation, driver examples, relationships guide, and custom driver tutorials:

**[📚 Full Documentation](https://github.com/shuruhatik/hawiah)**

## 🔗 Links

- [GitHub](https://github.com/shuruhatik/hawiah)
- [NPM](https://npmjs.com/package/hawiah)
- [Issues](https://github.com/shuruhatik/hawiah/issues)

## 📦 GitHub Repositories

### Core & Documentation
- [hawiah](https://github.com/Shuruhatik/hawiah) - Main package and unified API
- [hawiah-core](https://github.com/shuruhatik/hawiah-core) - Core abstractions and base classes
- [hawiah-docs](https://github.com/Shuruhatik/hawiah-docs) - Full documentation and guides

### Database Drivers
- [hawiah-local](https://github.com/Shuruhatik/hawiah-local) - JSON & YAML driver
- [hawiah-sqlite](https://github.com/Shuruhatik/hawiah-sqlite) - SQLite driver
- [hawiah-mysql](https://github.com/Shuruhatik/hawiah-mysql) - MySQL driver
- [hawiah-postgres](https://github.com/Shuruhatik/hawiah-postgres) - PostgreSQL driver
- [hawiah-firebase](https://github.com/Shuruhatik/hawiah-firebase) - Firebase Firestore driver
- [hawiah-mongo](https://github.com/Shuruhatik/hawiah-mongo) - MongoDB driver

## 📄 License

MIT © [Shuruhatik](https://github.com/shuruhatik)
