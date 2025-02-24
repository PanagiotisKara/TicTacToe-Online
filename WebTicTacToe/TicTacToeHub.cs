using Microsoft.AspNetCore.SignalR;

namespace WebTicTacToe
{
    public class TicTacToeHub : Hub
    {
        public async Task SendMove(int cellIndex)
        {
            await Clients.Others.SendAsync("ReceiveMove", cellIndex);
        }
        public async Task PlayerReady()
        {
            await Clients.All.SendAsync("ReceiveRestartReady");
        }
    }
}
