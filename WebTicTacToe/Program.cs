using WebTicTacToe;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapHub<TicTacToeHub>("/tictactoehub");

app.Run();
