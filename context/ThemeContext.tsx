import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

export type Theme = "light" | "dark";

interface ThemeContextType {
	theme: Theme;
	isDark: boolean;
	toggleTheme: () => void;
	setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
	theme: "light",
	isDark: false,
	toggleTheme: () => {},
	setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [theme, setThemeState] = useState<Theme>("light");

	const applyTheme = useCallback((t: Theme) => {
		if (typeof document === "undefined") return;
		const root = document.documentElement;
		if (t === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
	}, []);

	useEffect(() => {
		try {
			const initialTheme = window.matchMedia?.("(prefers-color-scheme: dark)")
				.matches
				? "dark"
				: "light";

			setThemeState(initialTheme);
			applyTheme(initialTheme);
		} catch (_) {}
	}, [applyTheme]);

	const setTheme = (newTheme: Theme) => {
		setThemeState(newTheme);
		applyTheme(newTheme);
	};

	const toggleTheme = () => {
		setTheme(theme === "dark" ? "light" : "dark");
	};

	return (
		<ThemeContext.Provider
			value={{ theme, isDark: theme === "dark", toggleTheme, setTheme }}
		>
			{children}
		</ThemeContext.Provider>
	);
};

export const useTheme = () => useContext(ThemeContext);
