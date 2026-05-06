import pyautogui
import pygetwindow as gw
import time
import sys

# Parte do nome da janela que queremos encontrar
PARTE_DO_NOME = "dominoteste-main" 

def automacao():
    print(f"Buscando janela que contenha: '{PARTE_DO_NOME}'...")
    print("Mova o mouse para o canto superior esquerdo da tela para abortar (Fail-Safe).")

    while True:
        try:
            # 1. Busca todas as janelas e filtra pela string desejada
            janelas = [w for w in gw.getWindowsWithTitle('') if PARTE_DO_NOME.lower() in w.title.lower()]

            if janelas:
                janela = janelas[0] # Pega a primeira correspondência

                # 2. Lida com janela minimizada
                if janela.isMinimized:
                    janela.restore()
                
                # 3. Tenta focar na janela
                try:
                    janela.activate()
                    time.sleep(0.5) # Tempo para o Windows processar o foco
                except Exception:
                    # Caso o activate falhe (comum no Windows), tentamos forçar o clique
                    pass

                # 4. Garante o foco clicando levemente dentro da janela (opcional)
                # Se o write ainda falhar, descomente as linhas abaixo:
                # centro_x, centro_y = janela.center
                # pyautogui.click(centro_x, centro_y)
                # time.sleep(0.3)

                # 5. Envia o comando
                pyautogui.write("continue", interval=0.05) # Intervalo pequeno evita erros de input
                pyautogui.press("enter")
                
                print(f"[{time.strftime('%H:%M:%S')}] Comando enviado para: {janela.title}")
            else:
                print(f"[{time.strftime('%H:%M:%S')}] Janela '{PARTE_DO_NOME}' nao encontrada.")

            # Espera 120 segundos (2 minutos) conforme seu comentário, ou 22s conforme seu sleep
            time.sleep(22)

        except KeyboardInterrupt:
            print("\nEncerrando...")
            break
        except Exception as e:
            print(f"Erro inesperado: {e}")
            time.sleep(5)

if __name__ == "__main__":
    automacao()
