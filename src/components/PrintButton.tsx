"use client";

export default function PrintButton() {
  return (
    <button className="btn pri" type="button" onClick={() => window.print()}>
      Print
    </button>
  );
}
