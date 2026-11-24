# DVT Mustache Judge - AI Code Review Guidelines

Welcome to the **DVT Movember Mustache Judge** repository. When reviewing pull requests, please prioritize the following engineering and architectural guidelines:

---

### 1. C# & .NET 10 Backend Quality
- **Null Safety & Warnings:** Ensure zero compiler warnings and strict null-safety (use `?.` and `??` defaults instead of unchecked dereferencing).
- **Asynchronous Execution:** Ensure all I/O methods accept and forward `CancellationToken` throughout async call stacks.
- **EF Core Best Practices:**
  - Use `.AsNoTracking()` for read-only queries to optimize memory and throughput.
  - Never execute unbounded queries without pagination or `.Take()` caps.
  - Invalidate in-memory caches (such as `MustacheController.InvalidateLeaderboardCache()`) whenever modifying entries.
- **Error Handling & Security:**
  - Never expose internal database stack traces or credentials in HTTP 500 responses.
  - Maintain anti-injection safeguards for contestant input (`InjectionDetector`).

---

### 2. Frontend & DVT 2026 UX/UI Standards
- **DVT Design System Tokens:** Strictly adhere to the official DVT 2026 design palette:
  - Primary Cyan/Blue: `#007FBA` / `#00B4D8`
  - Accent Gold/Amber: `#FFC629` / `#F59E0B`
  - Dark Surface: `#070c14` / `#0f172a`
  - Light Surface: `#f0f4f8` / `#ffffff`
- **Dual Theming (Dark/Light):** Verify that all gradient headers, cards, and modal components support both `dark` and `light` data-themes with proper contrast ratios.
- **Accessibility & Responsiveness:** Ensure mobile touch targets meet 44px minimum height and modals manage scroll locks and cleanup correctly.

---

### 3. Testing & Invariants
- Verify that every new endpoint or behavioral change includes unit or integration tests in `DvtMustacheJudge.Tests`.
- Keep the test suite 100% green (`dotnet test`).
