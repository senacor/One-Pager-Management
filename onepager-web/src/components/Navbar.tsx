import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
    const location = useLocation();
    return (
        <nav className="fixed top-0 left-0 h-full z-50 bg-dark-nav text-white shadow-md px-6 py-3 justify-center flex flex-col gap-6 items-center">
            <Link
                to="/"
                className={`hover:underline transition ${location.pathname === "/One-Pager-Management/app/" ? "underline font-semibold" : ""
                    }`}
            >
                Home
            </Link>
            <Link
                to="/blank"
                className={`hover:underline transition ${location.pathname === "/blank" ? "underline font-semibold" : ""
                    }`}
            >
                Blank Page
            </Link>
        </nav>
    );
}

