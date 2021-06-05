rewireLoggingToElement(
  () => document.getElementById("log"),
  () => document.getElementById("log-container"),
  true
);

function rewireLoggingToElement(eleLocator, eleOverflowLocator, autoScroll) {
  fixLoggingFunc("log");

  function fixLoggingFunc(name) {
    console.old = console.log;
    console.log = function (...arg) {
      const output = produceOutput(name, arg);
      const eleLog = eleLocator();

      if (autoScroll) {
        const eleContainerLog = eleOverflowLocator();
        const isScrolledToBottom =
          eleContainerLog.scrollHeight - eleContainerLog.clientHeight <=
          eleContainerLog.scrollTop + 1;
        eleLog.innerHTML += output + "<br>";
        if (isScrolledToBottom) {
          eleContainerLog.scrollTop =
            eleContainerLog.scrollHeight - eleContainerLog.clientHeight;
        }
      } else {
        eleLog.innerHTML += output + "<br>";
      }
    };
  }

  function produceOutput(name, args) {
    arg = args[0].replace("%c", "");
    return '<span style="' + args[1] + '">' + arg + "</span>&nbsp;";
  }
}
