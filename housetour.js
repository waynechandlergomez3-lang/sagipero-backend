<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>House Tour Interactive</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #fafafa;
      text-align: center;
      padding: 2rem;
    }
    h1 {
      margin-bottom: 1rem;
    }
    input {
      padding: 0.5rem;
      width: 60%;
      font-size: 1rem;
    }
    button {
      padding: 0.5rem 1rem;
      font-size: 1rem;
      margin-left: 0.5rem;
      cursor: pointer;
    }
    #scene {
      margin-top: 2rem;
      font-size: 3rem;
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .symbol {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .symbol span {
      font-size: 2rem;
    }
    .label {
      font-size: 0.9rem;
      color: #333;
      margin-top: 0.3rem;
    }
  </style>
</head>
<body>
  <h1>🎵 Sabrina Carpenter – House Tour (Interactive)</h1>
  <p>Type a lyric line and press Enter or click "Add".</p>
  <input id="lyricInput" type="text" placeholder="Enter a lyric line...">
  <button id="addBtn">Add</button>

  <div id="scene"></div>

  <script>
    const handlers = [
      {
        test: /house tour|do you want the house tour/i,
        symbol: "🏠",
        label: "House"
      },
      {
        test: /first.*second.*third|first, second, third|first second third|take you to the/i,
        symbol: "🪜 1️⃣2️⃣3️⃣",
        label: "Floors"
      },
      {
        test: /none of this is a metaphor|not a metaphor|is not a metaphor/i,
        symbol: "🔎",
        label: "Literal"
      },
      {
        test: /come inside|come in/i,
        symbol: "🚪➡️",
        label: "Come Inside"
      },
      {
        test: /what'?s mine is now yours|mine is now yours/i,
        symbol: "🔑❤️",
        label: "Shared"
      }
    ];

    const input = document.getElementById("lyricInput");
    const addBtn = document.getElementById("addBtn");
    const scene = document.getElementById("scene");

    function addSymbol(line) {
      const matched = handlers.find(h => h.test.test(line));
      if (matched) {
        const div = document.createElement("div");
        div.className = "symbol";
        div.innerHTML = `<span>${matched.symbol}</span><div class="label">${matched.label}</div>`;
        scene.appendChild(div);
      } else {
        alert("No match found for this line. Try another lyric.");
      }
    }

    addBtn.addEventListener("click", () => {
      if (input.value.trim()) {
        addSymbol(input.value.trim());
        input.value = "";
      }
    });

    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && input.value.trim()) {
        addSymbol(input.value.trim());
        input.value = "";
      }
    });
  </script>
</body>
</html>
