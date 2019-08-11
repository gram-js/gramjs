class AES {
 decryptIge(){/*
     var aes, blocks_count, cipher_text_block, iv1, iv2, plain_text, plain_text_block;
     iv1 = iv.slice(0, (Math.floor(iv.length / 2)));
     iv2 = iv.slice((Math.floor(iv.length / 2)));
     aes = new pyaes.AES(key);
     plain_text = ([0] * cipher_text.length);
     blocks_count = (Math.floor(cipher_text.length / 16));
     cipher_text_block = ([0] * 16);
     for (var block_index = 0, _pj_a = blocks_count; (block_index < _pj_a); block_index += 1) {
         for (var i = 0, _pj_b = 16; (i < _pj_b); i += 1) {
             cipher_text_block[i] = (cipher_text[((block_index * 16) + i)] ^ iv2[i]);
         }
         plain_text_block = aes.decrypt(cipher_text_block);
         for (var i = 0, _pj_b = 16; (i < _pj_b); i += 1) {
             plain_text_block[i] ^= iv1[i];
         }
         iv1 = cipher_text.slice((block_index * 16), ((block_index * 16) + 16));
         iv2 = plain_text_block.slice(0, 16);
         plain_text.slice((block_index * 16), ((block_index * 16) + 16)) = plain_text_block.slice(0, 16);
     }
     return bytes(plain_text);
*/


 }
}