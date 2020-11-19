package {{NAMESPACE}};

import com.ibm.streams.operator.AbstractOperator;
import com.ibm.streams.operator.OperatorContext;
import com.ibm.streams.operator.OutputTuple;
import com.ibm.streams.operator.StreamingOutput;
import com.ibm.streams.operator.model.OutputPortSet;
import com.ibm.streams.operator.model.OutputPortSet.WindowPunctuationOutputMode;
import com.ibm.streams.operator.model.OutputPorts;
import com.ibm.streams.operator.model.PrimitiveOperator;
import org.apache.log4j.Logger;

/**
 * A source operator that does not receive any input streams and produces new tuples. The method
 * <code>produceTuples</code> is called to begin submitting tuples.
 *
 * <p>For a source operator, the following event methods from the Operator interface can be called:
 *
 * <ul>
 *   <li><code>initialize()</code> to perform operator initialization
 *   <li><code>allPortsReady()</code> notification indicates the operator's ports are ready to
 *       process and submit tuples
 *   <li><code>shutdown()</code> to shutdown the operator. A shutdown request may occur at any time,
 *       such as a request to stop a PE or cancel a job. Thus the <code>shutdown()</code> may occur
 *       while the operator is processing tuples, punctuation marks, or even during port ready
 *       notification.
 * </ul>
 *
 * <p>With the exception of operator initialization, all the other events may occur concurrently
 * with each other, which lead to these methods being called concurrently by different threads.
 */
@PrimitiveOperator(
    name = "{{NAME}}",
    namespace = "{{NAMESPACE}}",
    description = "Java Operator {{NAME}}")
@OutputPorts({
  @OutputPortSet(
      description = "Port that produces tuples",
      cardinality = 1,
      optional = false,
      windowPunctuationOutputMode = WindowPunctuationOutputMode.Generating),
  @OutputPortSet(
      description = "Optional output ports",
      optional = true,
      windowPunctuationOutputMode = WindowPunctuationOutputMode.Generating)
})
public class {{NAME}} extends AbstractOperator {
  /** Thread for calling <code>produceTuples()</code> to produce tuple. */
  private Thread processThread;

  /**
   * Initialize this operator. Called once before any tuples are processed.
   *
   * @param context OperatorContext for this operator.
   * @throws Exception Operator failure, will cause the enclosing PE to terminate.
   */
  @Override
  public synchronized void initialize(OperatorContext context) throws Exception {
    // Must call super.initialize(context) to correctly setup an operator.
    super.initialize(context);
    Logger.getLogger(this.getClass())
        .trace(
            "Operator "
                + context.getName()
                + " initializing in PE: "
                + context.getPE().getPEId()
                + " in Job: "
                + context.getPE().getJobId());

    // TODO: If needed, insert code to establish connections or resources to communicate with an
    // external system or data store. The configuration information for this may come from
    // parameters supplied to the operator invocation, external configuration files, or a
    // combination of the two.

    // Create the thread for producing tuples. The thread is created at initialize time, but will be
    // started by allPortsReady().
    processThread =
        getOperatorContext()
            .getThreadFactory()
            .newThread(
                new Runnable() {

                  @Override
                  public void run() {
                    try {
                      produceTuples();
                    } catch (Exception e) {
                      Logger.getLogger(this.getClass()).error("Operator error", e);
                    }
                  }
                });

    // Set the thread not to be a daemon to ensure that the SPL runtime will wait for the thread to
    // complete before determining if the operator is complete.
    processThread.setDaemon(false);
  }

  /**
   * Notification that initialization is complete and all input and output ports are connected and
   * ready to receive and submit tuples.
   *
   * @throws Exception Operator failure, will cause the enclosing PE to terminate.
   */
  @Override
  public synchronized void allPortsReady() throws Exception {
    OperatorContext context = getOperatorContext();
    Logger.getLogger(this.getClass())
        .trace(
            "Operator "
                + context.getName()
                + " all ports are ready in PE: "
                + context.getPE().getPEId()
                + " in Job: "
                + context.getPE().getJobId());

    // Start a thread for producing tuples because operator implementations must not block and must
    // return control to the caller.
    processThread.start();
  }

  /**
   * Submit new tuples to the output stream.
   *
   * @throws Exception If an error occurs while submitting a tuple.
   */
  private void produceTuples() throws Exception {
    final StreamingOutput<OutputTuple> out = getOutput(0);

    // TODO: Modify the following code to create and submit tuples to the output port.
    OutputTuple tuple = out.newTuple();

    // Set attributes in tuple.
    // tuple.setString("AttributeName", "AttributeValue");

    // Submit tuple to output stream.
    out.submit(tuple);

    // TODO: If there is a finite set of tuples, submit a final punctuation when finished by
    // uncommenting the following line.
    // out.punctuate(Punctuation.FINAL_MARKER);
  }

  /**
   * Shutdown this operator, which will interrupt the thread executing the <code>produceTuples()
   * </code> method.
   *
   * @throws Exception Operator failure, will cause the enclosing PE to terminate.
   */
  public synchronized void shutdown() throws Exception {
    if (processThread != null) {
      processThread.interrupt();
      processThread = null;
    }
    OperatorContext context = getOperatorContext();
    Logger.getLogger(this.getClass())
        .trace(
            "Operator "
                + context.getName()
                + " shutting down in PE: "
                + context.getPE().getPEId()
                + " in Job: "
                + context.getPE().getJobId());

    // TODO: If needed, close connections or release resources related to any external system or
    // data store.

    // Must call super.shutdown().
    super.shutdown();
  }
}
