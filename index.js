/**
 * Entry point for standalone builds
 * This ensures the app registers properly for production builds
 */

import { registerRootComponent } from 'expo';
import App from './App';

// Register the main App component
registerRootComponent(App);
