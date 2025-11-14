import React from "react";

export default function TableDisplay({ payments }) {
  if (!payments || payments.length === 0) return <p>No payment data found.</p>;

  return (
    <div className="table-container">
      <table border="1">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Address</th>
            <th>Plan</th>
            <th>Screenshot</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.email}</td>
              <td>{p.address}</td>
              <td>{p.plan}</td>
              <td>
                {p.screenshotUrl ? (
                  (() => {
                    const url = p.screenshotUrl.startsWith("http")
                      ? p.screenshotUrl
                      : `http://localhost:5000${p.screenshotUrl}`;
                    return (
                      <a href={url} target="_blank" rel="noopener noreferrer">View</a>
                    );
                  })()
                ) : (
                  "No file"
                )}
              </td>
              <td>{new Date(p.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}