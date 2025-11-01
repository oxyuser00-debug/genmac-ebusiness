import { toast } from "react-toastify";

// For general notifications with color coding
export const showStatusToast = (msg, status, onClick) => {
  let bgColor;
  switch (status) {
    case "approved":
      bgColor = "#16a34a"; // green
      break;
    case "rejected":
      bgColor = "#dc2626"; // red
      break;
    case "new":
      bgColor = "#16a34a"; // green for new applications
      break;
    default:
      bgColor = "#3b82f6"; // blue / pending
  }

  toast(msg, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "light",
    onClick,
    style: { backgroundColor: bgColor, color: "white" },
  });
};
