import Analytics from './pages/Analytics';
import Home from './pages/Home';
import OnboardingService from './pages/OnboardingService';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "Home": Home,
    "OnboardingService": OnboardingService,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};