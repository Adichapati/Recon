"use client";

export default function LoginButton() {
  const login = () => {
    window.location.href = "http://localhost:5000/login";
  };

  return <button onClick={login}>Login with Google</button>;
}
