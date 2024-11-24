import React, { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { LogOut, PlusCircle } from "lucide-react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";

const TOTAL_DUE = 25000;
const RECIPIENT_PHONE = process.env.REACT_APP_RECIPIENT_PHONE;

const formatCurrency = (value) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const sendWhatsAppMessage = (date, amount) => {
  const formattedAmount = formatCurrency(amount);
  const formattedDate = new Date(date).toLocaleDateString("pt-BR");
  
  const message = `Nova transferência realizada!%0AData: ${formattedDate}%0AValor: ${formattedAmount} \n Acesse o sistema com seu login e verifique o histórico completo de transação! https://pug307-f22c32c21ecd.herokuapp.com/`;
  
  // Cria o link do WhatsApp e abre em nova janela
  const whatsappUrl = `https://wa.me/${RECIPIENT_PHONE}?text=${message}`;
  window.open(whatsappUrl, '_blank');
};

const PaymentManager = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [transfers, setTransfers] = useState([]);
  const [newTransfer, setNewTransfer] = useState({ date: "", amount: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "transfers"), (snapshot) => {
      const transfersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Ordenar as transferências por data (decrescente)
      transfersData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransfers(transfersData);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
  
    // Usando as variáveis de ambiente
    const adminUsername = process.env.REACT_APP_ADMIN_USERNAME;
    const adminPassword = process.env.REACT_APP_ADMIN_PASSWORD;
    const viewerUsername = process.env.REACT_APP_VIEWER_USERNAME;
    const viewerPassword = process.env.REACT_APP_VIEWER_PASSWORD;
  
    if (username === adminUsername && password === adminPassword) {
      setCurrentUser({ role: "admin" });
      setIsLoggedIn(true);
      setError("");
    } else if (username === viewerUsername && password === viewerPassword) {
      setCurrentUser({ role: "viewer" });
      setIsLoggedIn(true);
      setError("");
    } else {
      setError("Usuário ou senha incorretos");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setUsername("");
    setPassword("");
  };

  const handleAddTransfer = async (e) => {
    e.preventDefault();
    if (!newTransfer.date || !newTransfer.amount) {
      setError("Preencha todos os campos");
      return;
    }

    const amount = parseFloat(newTransfer.amount);
    if (isNaN(amount)) {
      setError("Valor inválido");
      return;
    }

    try {
      const [year, month, day] = newTransfer.date.split('-');
      const adjustedDate = `${year}-${month}-${day}T12:00:00`;

      // Adiciona a transferência ao Firestore
      await addDoc(collection(db, "transfers"), {
        date: adjustedDate,
        amount,
      });

      // Abre o WhatsApp com a mensagem
      sendWhatsAppMessage(adjustedDate, amount);

      setNewTransfer({ date: "", amount: "" });
      setError("");
    } catch (err) {
      setError("Erro ao adicionar transferência");
    }
  };

  const formatTransferDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  };

  const totalPaid = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);
  const remainingAmount = TOTAL_DUE - totalPaid;

  if (!isLoggedIn) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        bgcolor="grey.100"
      >
        <Card sx={{ maxWidth: 400, padding: 3 }}>
          <CardHeader
            title={<Typography variant="h6">Login</Typography>}
          />
          <CardContent>
            <form onSubmit={handleLogin}>
              <Box mb={2}>
                <TextField
                  label="Usuário"
                  fullWidth
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Box>
              <Box mb={2}>
                <TextField
                  label="Senha"
                  type="password"
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Box>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
              >
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box bgcolor="grey.100" py={4}>
      <Card sx={{ maxWidth: 800, mx: "auto" }}>
        <CardHeader
          title={<Typography variant="h6">Controle de Pagamentos</Typography>}
          action={
            <Button onClick={handleLogout} color="error">
              <LogOut />
            </Button>
          }
        />
        <CardContent>
          {currentUser?.role === "admin" && (
            <form onSubmit={handleAddTransfer}>
              <Grid container spacing={2} mb={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Data da Transferência"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={newTransfer.date}
                    onChange={(e) =>
                      setNewTransfer((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Valor da Transferência"
                    type="number"
                    fullWidth
                    value={newTransfer.amount}
                    onChange={(e) =>
                      setNewTransfer((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                  />
                </Grid>
              </Grid>
              {error && <Alert severity="error">{error}</Alert>}
              <Button
                type="submit"
                variant="contained"
                startIcon={<PlusCircle />}
              >
                Adicionar Transferência
              </Button>
            </form>
          )}

          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Histórico de Transferências
            </Typography>
            {transfers.map((transfer) => (
              <Box
                key={transfer.id}
                display="flex"
                justifyContent="space-between"
                mb={1}
                p={2}
                bgcolor="white"
                borderRadius={1}
              >
                <Typography>
                  {formatTransferDate(transfer.date)}
                </Typography>
                <Typography>{formatCurrency(transfer.amount)}</Typography>
              </Box>
            ))}
          </Box>

          {/* Exibindo o total pago e quanto falta */}
          <Box mt={4}>
            <Typography variant="h6">Resumo de Pagamentos</Typography>
            <Box display="flex" justifyContent="space-between" mt={2}>
              <Typography>Total Pago:</Typography>
              <Typography>{formatCurrency(totalPaid)}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mt={2}>
              <Typography>Restante a Pagar:</Typography>
              <Typography>{formatCurrency(remainingAmount)}</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PaymentManager;
