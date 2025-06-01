// ------------------------------------------------------------------
// Servicio de subida de archivos para el chat de Teneo
// ------------------------------------------------------------------
const fileUploader = {
  uploadFile(item, callbacks) {
    let pct = 0;
    const interval = setInterval(() => {
      pct += 20;
      callbacks.onUploadPercentageChanged(pct);
      if (pct >= 100) {
        clearInterval(interval);
        callbacks.onSucceeded();
      }
    }, 500);
  },
  deleteFile(itemId, callbacks) {
    setTimeout(() => callbacks.onSucceeded(), 300);
  },
  interrupt(itemId) {
    console.log('Interrumpiendo carga de', itemId);
  },
  interruptAll() {
    console.log('Interrumpiendo todas las cargas');
  }
};

function doFileUpload(item) {
  TeneoWebChat.call('add_message', {
    type: 'upload',
    author: 'user',
    data: {
      itemId: item.id,
      fileName: item.file.name,
      fileSymbol: item.file.name.split('.').pop(),
      initialUploadState: {
        status: 'IN_PROGRESS',
        controlAllowed: true
      }
    }
  });

  fileUploader.uploadFile(item, {
    onSucceeded: () => {
      TeneoWebChat.call('set_upload_state', {
        itemId: item.id,
        uploadState: { status: 'SUCCEEDED', controlAllowed: true, uploadPercentage: 100 }
      });
      vm.$teneoApi.sendBaseMessage('', { attachmentUrl: '<URL_FINAL>' });
    },
    onFailed: () => {
      TeneoWebChat.call('set_upload_state', {
        itemId: item.id,
        uploadState: { status: 'FAILED', controlAllowed: true, uploadPercentage: 0 }
      });
    },
    onInterrupted: () => {
      TeneoWebChat.call('set_upload_state', {
        itemId: item.id,
        uploadState: { status: 'INTERRUPTED', controlAllowed: true, uploadPercentage: 0 }
      });
    },
    onUploadPercentageChanged: pct => {
      TeneoWebChat.call('set_upload_state', {
        itemId: item.id,
        uploadState: { uploadPercentage: pct }
      });
    }
  });
}

let vm;

window.onload = () => {
  if (!window.TeneoWebChat || typeof window.TeneoWebChat.initialize !== 'function') {
    console.error('TeneoWebChat no disponible');
    return;
  }

  const chatContainer = document.getElementById('teneo-web-chat');
  vm = window.TeneoWebChat.initialize(chatContainer, {
    teneoEngineUrl: 'https://charmingmayflies-1300c5.bots.teneo.ai/ed_de_funeraria_70zgwz7pcc8sm9j437azqxymbs/'
  });

  TeneoWebChat.call('show_upload_button');

  TeneoWebChat.on('upload_button_clicked', () => {
    TeneoWebChat.call('show_upload_panel');
  });

  document.getElementById('openBot').addEventListener('click', () => {
    vm.$teneoApi.maximize();
  });

  TeneoWebChat.on('upload_panel_submit', payload => {
    payload.handledState.handled = true;
    payload.items.forEach(doFileUpload);
    TeneoWebChat.call('hide_upload_panel');
  });

  TeneoWebChat.on('upload_panel_cancel', payload => {
    TeneoWebChat.call('add_message', {
      type: 'text',
      author: 'bot',
      data: { text: `Has cancelado ${payload.itemsCount} archivos` }
    });
  });

  TeneoWebChat.on('upload_file_stop_clicked', ({ itemId, handledState }) => {
    handledState.handled = true;
    fileUploader.interrupt(itemId);
  });

  TeneoWebChat.on('upload_file_restart_clicked', ({ itemId, handledState }) => {
    handledState.handled = true;
    const item = { id: itemId, file: null }; // Nota: en un caso real deberías tener acceso al archivo original
    doFileUpload(item);
  });

  TeneoWebChat.on('upload_file_delete_clicked', ({ itemId, handledState }) => {
    handledState.handled = true;
    fileUploader.deleteFile(itemId, {
      onSucceeded: () => {
        TeneoWebChat.call('set_upload_state', {
          itemId,
          uploadState: { status: 'DELETED', controlAllowed: false, uploadPercentage: 0 }
        });
      },
      onFailed: () => console.warn('No se pudo eliminar', itemId)
    });
  });

  TeneoWebChat.on('reset', () => {
    fileUploader.interruptAll();
  });
};
