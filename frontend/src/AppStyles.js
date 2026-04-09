export const INJECTED_CSS = `
  /* ==============================
     1. 核心动画 (笔尖动力的源头)
     ============================== */
  @keyframes penWrite {
    0% { transform: rotate(0deg) translateX(0); }
    25% { transform: rotate(-15deg) translateX(-5px); }
    75% { transform: rotate(15deg) translateX(5px); }
    100% { transform: rotate(0deg) translateX(0); }
  }

  @keyframes fadeIn { 
    from { opacity: 0; transform: translateY(10px); } 
    to { opacity: 1; transform: translateY(0); } 
  }

  /* --- 钢笔类名：必须是 inline-block 才能旋转 --- */
  .animate-pen {
    display: inline-block !important; 
    animation: penWrite 1.2s infinite ease-in-out;
    font-size: 40px;
    margin-bottom: 20px;
  }

  .ouican-fade-in { 
    animation: fadeIn 0.4s ease-out; 
  }

  /* ==============================
     2. Header Section (大报版面优化)
     ============================== */
  .ouican-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 4px solid #1A1A1A;
    border-bottom: 1px solid #1A1A1A;
    padding: 31px 0 21px 0;
    margin-bottom: 40px;
    position: relative;
    width: 100%;
  }

  .header-center {
    flex: 1;
    text-align: center;
    padding-left: 30px; 
  }

  .header-center h1 {
    font-family: 'UnifrakturMaguntia', serif;
    font-size: 84px;
    letter-spacing: 2px;
    margin: 0;
    line-height: 0.9;
    color: #123524;
    text-shadow: 1px 1px 0px rgba(0,0,0,0.1);
  }

  .header-tagline {
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: #333;
    margin-top: 4px;
    display: block;
    font-weight: 600;
  }

  .header-ear-right {
    width: 160px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 25px;
    padding-left: 20px;
    position: relative;
  }

  .header-ear-right::before {
    content: "";
    position: absolute;
    left: 0;
    width: 1px;
    height: 48px;
    background: rgba(0,0,0, 0.2);
  }

  .ear-text-box {
    font-family: 'Inter', sans-serif;
    font-size: 9px;
    line-height: 1.3;
    text-align: right;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .ear-streak-value {
    font-family: 'Playfair Display', serif;
    font-size: 56px;
    font-weight: 700;
    color: #123524;
    line-height: 1;
  }

  /* 文章排版细节 */
  .passage-text::first-letter {
    font-family: 'UnifrakturMaguntia', serif;
    float: left;
    font-size: 4em;
    line-height: 0.7;
    margin-top: 0.1em;
    margin-right: 0.12em;
    color: #123524;
  }

  .passage-text {
    text-align: justify;
    hyphens: auto;
  }

  /* 强制生词卡片内部的所有文字回归现代字体 */
  .word-card, 
  [class*="modal"], 
  [class*="popup"] {
    font-family: 'Inter', sans-serif !important;
  }

  /* 单词标题可以优雅，但必须好认 */
  .word-card h2, 
  .word-card strong {
    font-family: 'Playfair Display', serif !important;
    font-weight: 700 !important;
    letter-spacing: 0 !important;
    text-transform: none !important;
  }

  /* 解释和例句 */
  .word-card p, 
  .word-card span {
    font-family: 'Inter', sans-serif !important;
    line-height: 1.5;
    color: #333;
`;