export default function Navbar() {
  return (
    <div
      style={{
        width: '100%',
        padding: '10px 16px',
        background: '#A6192E',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      {/* (Logo + Star) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <img
          src="star.png"
          alt="icon"
          style={{
            width: 25,
            height: 25,
          }}
        />
        <div
          style={{
            color: 'white',
            fontSize: 24,
            fontFamily: 'Proxima Nova',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          AztecPlanner
        </div>
      </div>

      {/* (Tutorial button) */}
      <div
        style={{
          padding: '5px 10px',
          borderRadius: 10,
          border: '1px solid white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            color: 'white',
            fontSize: 16,
            fontFamily: 'Proxima Nova',
            fontWeight: 500,
          }}
        >
          Demo
        </div>
      </div>
    </div>
  );
}