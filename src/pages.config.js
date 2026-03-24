// ──────────────────────────────────────────────────────────
// Bem na Mosca — DARIO WOLOSZIN
// https://github.com/dwoloszin
// ──────────────────────────────────────────────────────────
import PriceComparison from './pages/PriceComparison';
import ProductDetail from './pages/ProductDetail';
import Products from './pages/Products';
import Profile from './pages/Profile';
import ShoppingLists from './pages/ShoppingLists';
import Scanner from './pages/Scanner';
import Home from './pages/Home';
import ShoppingListDetail from './pages/ShoppingListDetail';
import Login from './pages/Login';
import UsernameSetup from './pages/UsernameSetup';
import UserPage from './pages/User';
import StoreDetail from './pages/StoreDetail';
import FastList from './pages/FastList';
import __Layout from './Layout.jsx';

export const PAGES = {
    "PriceComparison": PriceComparison,
    "ProductDetail": ProductDetail,
    "Products": Products,
    "Profile": Profile,
    "User": UserPage,
    "ShoppingLists": ShoppingLists,
    "Scanner": Scanner,
    "Home": Home,
    "ShoppingListDetail": ShoppingListDetail,
    "Login": Login,
    "UsernameSetup": UsernameSetup,
    "StoreDetail": StoreDetail,
    "FastList": FastList,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
