const INK = "#2a170f";
const PAPER = "#f4ecd8";
const GOLD = "#eab619";
const RED = "#cc291f";
const NAVY = "#1e3958";
const TEAL = "#35858a";
const ORANGE = "#d96b2a";

export function PlayerMarketOgCard() {
  return (
    <div
      style={{
        backgroundColor: PAPER,
        backgroundImage:
          "linear-gradient(rgba(42,23,15,.13) 1px, transparent 1px), linear-gradient(90deg, rgba(42,23,15,.13) 1px, transparent 1px)",
        backgroundSize: "72px 72px",
        color: INK,
        display: "flex",
        fontFamily: "DM Sans",
        height: "100%",
        padding: "48px 58px",
        position: "relative",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: "62%" }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Bungee",
            fontSize: 24,
            gap: 10,
          }}
        >
          <span style={{ color: RED }}>PLAYER</span>
          <span>MARKET · HACKSPAIN 2026</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "Bungee",
            fontSize: 66,
            letterSpacing: -3,
            lineHeight: 0.98,
            marginTop: 42,
          }}
        >
          <span>FICHA A LOS</span>
          <span
            style={{
              color: RED,
              textShadow: `6px 6px 0 ${GOLD}`,
            }}
          >
            BUILDERS
          </span>
          <span>DEL FUTURO.</span>
        </div>
        <div
          style={{
            border: `3px solid ${INK}`,
            display: "flex",
            fontSize: 18,
            fontWeight: 900,
            marginTop: 38,
            padding: "13px 18px",
          }}
        >
          PERFILES VERIFICADOS · EL BUILDER SIEMPRE DECIDE
        </div>
      </div>

      <div
        style={{
          backgroundColor: NAVY,
          border: `6px solid ${INK}`,
          boxShadow: `16px 16px 0 ${GOLD}`,
          color: PAPER,
          display: "flex",
          flexDirection: "column",
          height: 520,
          marginLeft: 38,
          overflow: "hidden",
          position: "relative",
          transform: "rotate(1deg)",
          width: 355,
        }}
      >
        <div
          style={{
            background: GOLD,
            border: `2px solid ${INK}`,
            color: INK,
            display: "flex",
            fontSize: 15,
            fontWeight: 900,
            padding: "7px 10px",
            position: "absolute",
            right: 16,
            top: 16,
          }}
        >
          FICHA DESTACADA · #01
        </div>
        <div
          style={{
            background: RED,
            boxShadow: `0 30px 0 ${GOLD}, 0 60px 0 ${TEAL}`,
            display: "flex",
            height: 22,
            left: -60,
            position: "absolute",
            top: 175,
            transform: "rotate(-9deg)",
            width: 500,
          }}
        />
        <div
          style={{
            alignItems: "center",
            display: "flex",
            height: 280,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: ORANGE,
              border: `7px solid ${PAPER}`,
              borderRadius: 999,
              boxShadow: `10px 10px 0 ${INK}`,
              display: "flex",
              fontFamily: "Bungee",
              fontSize: 64,
              height: 160,
              justifyContent: "center",
              width: 160,
            }}
          >
            HS
          </div>
        </div>
        <div
          style={{
            borderTop: `3px solid ${PAPER}`,
            display: "flex",
            flexDirection: "column",
            padding: "20px 24px",
          }}
        >
          <span style={{ color: GOLD, fontSize: 16, fontWeight: 900 }}>
            BUILDERS · MADRID
          </span>
          <span
            style={{
              fontFamily: "Bungee",
              fontSize: 38,
              lineHeight: 1,
              marginTop: 8,
            }}
          >
            TU FICHA
          </span>
          <div style={{ display: "flex", gap: 7, marginTop: 18 }}>
            {["BUILD", "SHIP", "TEAM"].map((skill) => (
              <span
                key={skill}
                style={{
                  border: `2px solid ${PAPER}`,
                  display: "flex",
                  fontSize: 14,
                  fontWeight: 900,
                  padding: "4px 7px",
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
