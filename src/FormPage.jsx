import React, { useState, useEffect } from "react";
import { db, auth } from "./firebase-config";
import { setDoc, doc, getDoc } from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import jsPDF from "jspdf";

const FormPage = () => {
  const [formData, setFormData] = useState({
    parentName: "",
    email: "",
    phone: "",
    countryCode: "+1", // default country code
    studentName: "",
    ip: "",
    timestamp: "",
  });

  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);

      // const docRef = doc(db, "consents", user.email);
      // const docSnap = await getDoc(docRef);

      // if (docSnap.exists()) {
      //   setFormData(docSnap.data());
      //   // Do not setSubmitted here to prevent auto-submitting
      // } else {
      //   // setFormData((prev) => ({ ...prev, email: user.email }));
      // }
    } catch (error) {
      setError("Login failed: " + error.message);
    }
  };

  // Get IP address
  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then((res) => res.json())
      .then((data) => {
        setFormData((prev) => ({ ...prev, ip: data.ip }));
      })
      .catch(() => {
        setFormData((prev) => ({ ...prev, ip: "Unavailable" }));
      });
  }, []);

  // Get current user and timestamp
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const res = await fetch("https://ipapi.co/json/?ip=ipv4");
          const data = await res.json();

          // Determine default country code based on the IP's country code
          let countryCode = "+91"; // Default to India if country code can't be detected
          switch (data.country_code) {
            case "IN":
              countryCode = "+91";
              break;
            case "US":
              countryCode = "+1";
              break;
            case "SG":
              countryCode = "+65";
              break;
            case "MY":
              countryCode = "+60";
              break;
            default:
              countryCode = "+91";
          }

          // Get the local time based on the user's timezone
          const localTime = new Date().toLocaleString(undefined, {
            timeZone: data.timezone || "Asia/Kolkata", // Default to India timezone if none available
          });

          // Only set the countryCode if user hasn't manually changed it (still default "+1")
          setFormData((prev) => ({
            ...prev,
            email: user.email,
            ip: data.ip, // Only IPv4
            timestamp: localTime,
            ...(prev.countryCode === "+1" && { countryCode }),
          }));
        } catch (err) {
          console.error("Failed to fetch IP data", err);
          const fallbackTime = new Date().toLocaleString();
          setFormData((prev) => ({
            ...prev,
            email: user.email,
            ip: "Unavailable",
            timestamp: fallbackTime,
            ...(prev.countryCode === "+1" && { countryCode: "+91" }),
          }));
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!agreed) {
      setError("You must agree to the terms before submitting.");
      return;
    }

    try {
      await setDoc(doc(db, "consents", formData.email), formData);
      setSubmitted(true);
    } catch (err) {
      setError("Failed to submit: " + err.message);
    }
  };

  const handleDownloadPDF = () => {
    const docPdf = new jsPDF();
    const marginLeft = 20;
    let verticalOffset = 20;

    docPdf.setFontSize(18);
    docPdf.setTextColor(40, 40, 40);
    docPdf.text("Parental Consent Form", marginLeft, verticalOffset);

    verticalOffset += 10;
    docPdf.setDrawColor(100);
    docPdf.setLineWidth(0.5);
    docPdf.line(marginLeft, verticalOffset, 190, verticalOffset);

    verticalOffset += 10;
    docPdf.setFontSize(12);
    docPdf.setTextColor(80, 80, 80);

    const info = [
      ["Parent's Name", formData.parentName],
      ["Email", formData.email],
      ["Phone", `${formData.countryCode} ${formData.phone}`],
      ["Student's First Name", formData.studentName],
      // ["IP Address", formData.ip],
      ["Timestamp", formData.timestamp],
      ["Consent Given", "YES"],
    ];

    info.forEach(([label, value]) => {
      docPdf.setFont(undefined, "bold");
      docPdf.text(`${label}:`, marginLeft, verticalOffset);
      docPdf.setFont(undefined, "normal");
      docPdf.text(`${value}`, marginLeft + 50, verticalOffset);
      verticalOffset += 8;
    });

    const tncLines = [
      "",
      "Terms and Conditions",
      "1. This form grants permission for your child's independently-created website to be published publicly.",
      "2. The student retains full ownership and rights to their created content.",
      "3. No personal data (photos, full name, contact info) will be collected unless stated and agreed later.",
      "4. You are granting permission for hosting the student's work online for educational or portfolio purposes.",
      "5. You may request the takedown of your child’s work at any time.",
      "6. The provided contact information may be used by me to communicate regarding your child's website.",
      "7. If you need to contact me, you can reach me at **+91-8368193112** or **rohit255141@gmail.com**.",
      "8. By agreeing to the terms, you confirm that you are the legal guardian and consent to the publication of your child's work.",
    ];

    docPdf.setFontSize(10);
    docPdf.setTextColor(120);
    tncLines.forEach((line, i) => {
      docPdf.text(line, 20, 80 + i * 10, { maxWidth: 170 });
    });

    verticalOffset += 100;
    docPdf.setFontSize(10);
    docPdf.setTextColor(20);
    docPdf.setFont(undefined, "italic");
    docPdf.text(
      "This form confirms the consent of the legal guardian for the publication of the student's project online.",
      marginLeft,
      verticalOffset,
      { maxWidth: 180 }
    );

    docPdf.save("Parental_Consent_Form.pdf");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='10' y='10' width='60' height='60' rx='16' fill='%23e5e7eb' opacity='0.05'/%3E%3Ccircle cx='40' cy='40' r='32' fill='none' stroke='%23d1d5db' stroke-width='0.8' opacity='0.13'/%3E%3Cpath d='M20 0v80M40 0v80M60 0v80M0 20h80M0 40h80M0 60h80' stroke='%23d1d5db' stroke-width='0.5' opacity='0.22'/%3E%3Ccircle cx='40' cy='40' r='2' fill='%23d1d5db' opacity='0.18'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-8">
        {/* Hero Banner */}
        <div className="flex flex-col justify-center items-center gap-2">
          <h1
            className="text-3xl font-semibold text-gray-900 mb-2 text-center leading-tight"
            style={{
              fontFamily: "San Francisco, Helvetica, Arial, sans-serif",
            }}
          >
            <span className="block">Student Website</span>
            <span className="block" style={{ color: "#1a73e8" }}>
              Publishing Consent
            </span>
          </h1>
        </div>
        {/* Form and Terms in a single-column vertical stack */}
        <div className="flex flex-col md:flex-row gap-10 items-stretch">
          {/* Terms and Conditions Card */}
          <div
            className="h-full rounded-2xl p-8 bg-white/90 shadow-[0_4px_24px_0_rgba(0,0,0,0.05)] flex flex-col justify-start md:w-1/2"
            style={{
              boxShadow:
                "0 4px 24px 0 rgba(0,0,0,0.07), 0 1.5px 3px 0 rgba(0,0,0,0.02)",
              border: "none",
            }}
          >
            <h2
              className="text-2xl font-semibold text-gray-900 mb-5 pb-2 text-center"
              style={{
                fontFamily: "San Francisco, Helvetica, Arial, sans-serif",
              }}
            >
              Terms and Conditions
            </h2>
            <ul
              className="list-disc text-gray-700 text-base space-y-3 ml-6 leading-relaxed"
              style={{
                fontFamily: "San Francisco, Helvetica, Arial, sans-serif",
              }}
            >
              <li>
                This form grants permission for your child's
                independently-created website to be published publicly.
              </li>
              <li>
                The student retains full ownership and rights to their created
                content.
              </li>
              <li>
                No personal data (photos, full name, contact info) will be
                collected unless stated and agreed later.
              </li>
              <li>
                You are granting permission for hosting the student's work
                online for educational or portfolio purposes.
              </li>
              <li>
                You may request the takedown of your child’s work at any time.
              </li>
              <li>
                The provided contact information may be used by me to
                communicate regarding your child's website.
              </li>
              <li>
                To contact me, reach out at{" "}
                <strong style={{ color: "#1a73e8" }}>+91-8368193112</strong> or{" "}
                <strong style={{ color: "#1a73e8" }}>
                  rohit255141@gmail.com
                </strong>
                .
              </li>
              <li>
                <strong>
                  By agreeing to the terms, you confirm that you are the legal
                  guardian and consent to the publication of your child's work.
                </strong>
              </li>
            </ul>
            <div className="flex items-center mt-6">
              <input
                type="checkbox"
                checked={agreed}
                onChange={() => setAgreed(!agreed)}
                className="h-5 w-5 rounded-lg border-gray-300 bg-white focus:ring-2 transition-all shadow-sm"
                id="agreeCheckbox"
                style={{ accentColor: "#1a73e8" }}
              />
              <label
                htmlFor="agreeCheckbox"
                className="ml-3 text-base text-gray-700 select-none"
                style={{
                  fontFamily: "San Francisco, Helvetica, Arial, sans-serif",
                }}
              >
                I have read and agree to the terms above.
              </label>
            </div>
            {/* Spacer to balance card heights */}
            <div className="flex-1" />
          </div>
          {/* Form Card */}
          <div
            className="h-full rounded-2xl p-8 bg-white/90 shadow-[0_4px_24px_0_rgba(0,0,0,0.07)] flex flex-col justify-start md:w-1/2"
            style={{
              boxShadow:
                "0 4px 24px 0 rgba(0,0,0,0.07), 0 1.5px 3px 0 rgba(0,0,0,0.02)",
              border: "none",
            }}
          >
            <h2
              className="text-3xl font-semibold text-gray-900 mb-5 pb-2 text-center"
              style={{
                fontFamily: "San Francisco, Helvetica, Arial, sans-serif",
              }}
            >
              Parental Consent Form
            </h2>
            {!submitted ? (
              <form
                onSubmit={handleSubmit}
                className="space-y-6"
                style={{
                  fontFamily: "San Francisco, Helvetica, Arial, sans-serif",
                }}
              >
                {/* Parent Name Floating Label */}
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="parentName"
                    className="text-gray-700 font-medium"
                  >
                    Parent's Name
                  </label>
                  <input
                    id="parentName"
                    type="text"
                    name="parentName"
                    required
                    value={formData.parentName}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 bg-white text-gray-900 font-normal rounded-xl border border-gray-200 focus:outline-none focus:ring-2 transition placeholder-gray-400 shadow-sm"
                    style={{
                      fontFamily: "San Francisco, Helvetica, Arial, sans-serif",
                      ...(true && {
                        boxShadow: undefined,
                        borderColor: undefined,
                      }),
                    }}
                    placeholder="Parent's Name"
                    style={{
                      fontFamily: "San Francisco, Helvetica, Arial, sans-serif",
                    }}
                  />
                </div>
                {/* Phone Floating Label + Country Code */}
                <div className="flex gap-3">
                  <div className="w-32 flex flex-col gap-1">
                    <label
                      htmlFor="countryCode"
                      className="text-gray-700 font-medium"
                    >
                      Country
                    </label>
                    <select
                      id="countryCode"
                      name="countryCode"
                      value={formData.countryCode}
                      onChange={handleInputChange}
                      className="block w-full px-4 py-3 bg-white text-gray-900 font-normal rounded-xl border border-gray-200 focus:outline-none focus:ring-2 transition shadow-sm"
                      style={{
                        fontFamily:
                          "San Francisco, Helvetica, Arial, sans-serif",
                      }}
                    >
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+65">🇸🇬 +65</option>
                      <option value="+60">🇲🇾 +60</option>
                    </select>
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <label
                      htmlFor="phone"
                      className="text-gray-700 font-medium"
                    >
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="block w-full px-4 py-3 bg-white text-gray-900 font-normal rounded-xl border border-gray-200 focus:outline-none focus:ring-2 transition placeholder-gray-400 shadow-sm"
                      placeholder="Phone Number"
                      style={{
                        fontFamily:
                          "San Francisco, Helvetica, Arial, sans-serif",
                      }}
                    />
                  </div>
                </div>
                {/* Student Name Floating Label */}
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="studentName"
                    className="text-gray-700 font-medium"
                  >
                    Student's First Name
                  </label>
                  <input
                    id="studentName"
                    type="text"
                    name="studentName"
                    required
                    value={formData.studentName}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 bg-white text-gray-900 font-normal rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition placeholder-gray-400 shadow-sm"
                    placeholder="Student's First Name"
                    style={{
                      fontFamily: "San Francisco, Helvetica, Arial, sans-serif",
                    }}
                  />
                </div>
                {/* Email/Google Auth */}
                {!formData.email ? (
                  <button
                    onClick={loginWithGoogle}
                    type="button"
                    className="w-full py-3 rounded-xl font-semibold transition focus:outline-none shadow-sm"
                    style={{
                      backgroundColor: "#d93025",
                      color: "#fff",
                      fontFamily: "San Francisco, Helvetica, Arial, sans-serif",
                      transition: "background 0.2s, color 0.2s",
                    }}
                  >
                    Sign in with Google
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="text-gray-700 font-medium block mb-1">
                        Email (auto-filled)
                      </label>
                      <input
                        type="email"
                        disabled
                        value={formData.email}
                        className="block w-full px-4 py-3 bg-gray-100 text-gray-700 font-normal rounded-xl border border-gray-200 cursor-not-allowed"
                        style={{
                          fontFamily:
                            "San Francisco, Helvetica, Arial, sans-serif",
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        auth.signOut();
                        localStorage.removeItem("consentFormData");
                        setFormData((prev) => ({ ...prev, email: "" }));
                      }}
                      className="w-full py-3 rounded-xl font-semibold transition focus:outline-none shadow-sm"
                      style={{
                        backgroundColor: "#d93025",
                        color: "#fff",
                        fontFamily:
                          "San Francisco, Helvetica, Arial, sans-serif",
                        transition: "background 0.2s, color 0.2s",
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                <button
                  type="submit"
                  disabled={!agreed || !formData.email}
                  className={`w-full py-3 rounded-xl font-semibold mt-2 transition focus:outline-none shadow-sm ${
                    !agreed || !formData.email
                      ? "bg-gray-200 cursor-not-allowed text-gray-400"
                      : ""
                  }`}
                  style={{
                    fontFamily: "San Francisco, Helvetica, Arial, sans-serif",
                    ...(agreed && formData.email
                      ? {
                          backgroundColor: "#1a73e8",
                          color: "#fff",
                        }
                      : {}),
                  }}
                >
                  Submit Consent
                </button>
              </form>
            ) : (
              <div className="text-center space-y-6">
                <p
                  className="font-semibold text-lg"
                  style={{ color: "#1a73e8" }}
                >
                  Consent submitted successfully!
                </p>
                <button
                  onClick={handleDownloadPDF}
                  className="px-6 py-3 rounded-xl font-semibold transition focus:outline-none shadow-sm"
                  style={{
                    backgroundColor: "#1a73e8",
                    color: "#fff",
                    fontFamily: "San Francisco, Helvetica, Arial, sans-serif",
                  }}
                >
                  Download Consent PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormPage;
