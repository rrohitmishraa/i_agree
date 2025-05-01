import React, { useState, useEffect } from "react";
import { db, auth } from "./firebase-config";
import { setDoc, doc, getDoc } from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import backgroundImage from "./images/bg.png"; // Add a background image in your assets folder

const FormPage = () => {
  const [formData, setFormData] = useState({
    parentName: "",
    email: "",
    phone: "",
    countryCode: "+91", // default country code
    studentName: "",
    ip: "",
    timestamp: "",
  });

  // Persist form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("consentFormData", JSON.stringify(formData));
  }, [formData]);
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const docRef = doc(db, "consents", user.email);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setFormData(docSnap.data());
        // Do not setSubmitted here to prevent auto-submitting
      } else {
        setFormData((prev) => ({ ...prev, email: user.email }));
      }
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

          // Set the form data with the user's IP, timestamp, and country code
          setFormData((prev) => ({
            ...prev,
            email: user.email,
            ip: data.ip, // Only IPv4
            timestamp: localTime,
            countryCode,
          }));
        } catch (err) {
          console.error("Failed to fetch IP data", err);
          const fallbackTime = new Date().toLocaleString();
          setFormData((prev) => ({
            ...prev,
            email: user.email,
            ip: "Unavailable",
            timestamp: fallbackTime,
            countryCode: "+91", // Default fallback to India country code
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
      className="relative min-h-screen bg-cover bg-center flex items-center justify-center px-4 py-8"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50 z-0"></div>

      <div className="relative z-10 w-full max-w-5xl bg-white p-8 rounded-2xl shadow-2xl bg-opacity-90 backdrop-blur-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Terms and Conditions */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-indigo-700 text-center">
              Terms and Conditions
            </h2>
            <ul className="list-disc text-gray-700 text-sm space-y-2 ml-6">
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
                To contact me, reach out at <strong>+91-8368193112</strong> or{" "}
                <strong>rohit255141@gmail.com</strong>.
              </li>
              <li>
                <strong>
                  By agreeing to the terms, you confirm that you are the legal
                  guardian and consent to the publication of your child's work.
                </strong>
              </li>
            </ul>
            <div className="flex items-start">
              <input
                type="checkbox"
                checked={agreed}
                onChange={() => setAgreed(!agreed)}
                className="mt-1 mr-2"
              />
              <label className="text-sm text-gray-700">
                I have read and agree to the terms above.
              </label>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-indigo-700 text-center">
              Parental Consent Form
            </h2>
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Parent's Name
                  </label>
                  {/* Parent Name */}
                  <input
                    type="text"
                    name="parentName"
                    required
                    value={formData.parentName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="mt-1 block w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <div className="flex flex-col space-y-2">
                    <select
                      name="countryCode"
                      value={formData.countryCode}
                      onChange={handleInputChange}
                      className="p-3 border rounded-md"
                    >
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+65">🇸🇬 +65</option>
                      <option value="+60">🇲🇾 +60</option>
                    </select>

                    {/* Phone Number */}
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      className="mt-1 block w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Student's First Name
                  </label>
                  {/* Student Name */}
                  <input
                    type="text"
                    name="studentName"
                    required
                    value={formData.studentName}
                    onChange={handleInputChange}
                    placeholder="Enter student first name"
                    className="mt-1 block w-full p-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {!formData.email ? (
                  <button
                    onClick={loginWithGoogle}
                    type="button"
                    className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold"
                  >
                    Sign in with Google
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email (auto-filled)
                      </label>
                      <input
                        type="email"
                        disabled
                        value={formData.email}
                        className="mt-1 block w-full p-3 bg-gray-100 border rounded-md"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        auth.signOut();
                        localStorage.removeItem("consentFormData");
                        setFormData((prev) => ({ ...prev, email: "" }));
                      }}
                      className="w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm"
                    >
                      Logout
                    </button>
                  </div>
                )}

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={!agreed || !formData.email}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    !agreed || !formData.email
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  Submit Consent
                </button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-green-600 font-medium text-lg">
                  Consent submitted successfully!
                </p>
                <button
                  onClick={handleDownloadPDF}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg"
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
