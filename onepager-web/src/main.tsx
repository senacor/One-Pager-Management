import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter, Routes, Route } from "react-router-dom";
// import Navbar from "./components/Navbar";
import BlankPage from "./components/BlankPage.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            {/* <Navbar /> */}
            <Routes>
                <Route path="/" element={<App />} />
                <Route path="/blank" element={<BlankPage />} />
            </Routes>
        </BrowserRouter>
    </StrictMode>
);
