import { useState } from "react";
import "./App.css";
import AIHomePage from "./AIHomePage";
import { ThemeProviderWrapper } from "./ThemeProvider";

function App() {
  const [count, setCount] = useState(0);

  return (
    <ThemeProviderWrapper>
      <AIHomePage />
    </ThemeProviderWrapper>
  );
}

export default App;
