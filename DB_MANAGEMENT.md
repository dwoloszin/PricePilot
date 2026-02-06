# Database Management API

PricePilot2 now includes a `dbManager` utility that allows you to directly interact with the database (GitHub JSON files) for administrative tasks.

## Accessing the API

The `dbManager` is automatically attached to the `window` object. You can access it directly from your browser's **Developer Console** (F12 -> Console).

## Available Commands

### 1. Extract Data (Read)
View all records for a specific entity.
```javascript
// Entities: 'Product', 'PriceEntry', 'Store', 'ShoppingList', 'User'
await dbManager.extract('Product');
```

### 2. Get Single Record
```javascript
await dbManager.get('Product', 'product_id_here');
```

### 3. Edit Record (Update)
```javascript
await dbManager.edit('Product', 'id_here', { name: 'New Name', brand: 'New Brand' });
```

### 4. Exclude Record (Delete)
```javascript
await dbManager.exclude('Store', 'store_id_here');
```

### 5. Insert Record (Create)
```javascript
await dbManager.insert('Store', { name: 'New Store', address: '123 Street' });
```

### 6. Export Entire Database
Download all data as a single JSON object.
```javascript
const allData = await dbManager.exportAll();
console.log(allData);
```

## Security Note
This management API uses the same authentication as the app. To perform operations that sync to GitHub, ensure you have the correct `VITE_GITHUB_TOKEN` configured in your environment.
