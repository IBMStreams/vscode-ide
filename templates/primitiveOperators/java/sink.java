package {{NAMESPACE}};

import com.ibm.streams.operator.AbstractOperator;
import com.ibm.streams.operator.OperatorContext;
import com.ibm.streams.operator.StreamingData.Punctuation;
import com.ibm.streams.operator.StreamingInput;
import com.ibm.streams.operator.Tuple;
import com.ibm.streams.operator.model.InputPortSet;
import com.ibm.streams.operator.model.InputPortSet.WindowMode;
import com.ibm.streams.operator.model.InputPortSet.WindowPunctuationInputMode;
import com.ibm.streams.operator.model.InputPorts;
import com.ibm.streams.operator.model.PrimitiveOperator;
import org.apache.log4j.Logger;

/**
 * Class for an operator that consumes tuples and does not produce an output stream. This pattern
 * supports a number of input streams and no output streams.
 *
 * <p>The following event methods from the Operator interface can be called:
 *
 * <ul>
 *   <li><code>initialize()</code> to perform operator initialization
 *   <li><code>allPortsReady()</code> notification indicates the operator's ports are ready to
 *       process and submit tuples
 *   <li><code>process()</code> handles a tuple arriving on an input port
 *   <li><code>processPuncuation()</code> handles a punctuation mark arriving on an input port
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
@InputPorts({
  @InputPortSet(
      description = "Port that ingests tuples",
      cardinality = 1,
      optional = false,
      windowingMode = WindowMode.NonWindowed,
      windowPunctuationInputMode = WindowPunctuationInputMode.Oblivious),
  @InputPortSet(
      description = "Optional input ports",
      optional = true,
      windowingMode = WindowMode.NonWindowed,
      windowPunctuationInputMode = WindowPunctuationInputMode.Oblivious)
})
public class {{NAME}} extends AbstractOperator {
  /**
   * Initialize this operator. Called once before any tuples are processed.
   *
   * @param context OperatorContext for this operator.
   * @throws Exception Operator failure, will cause the enclosing PE to terminate.
   */
  @Override
  public synchronized void initialize(OperatorContext context) throws Exception {
    // Must call super.initialize(context) to correctly set up an operator.
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
  }

  /**
   * Notification that initialization is complete and all input and output ports are connected and
   * ready to receive and submit tuples.
   *
   * @throws Exception Operator failure, will cause the enclosing PE to terminate.
   */
  @Override
  public synchronized void allPortsReady() throws Exception {
    // This method is commonly used by source operators. Operators that process incoming tuples
    // generally do not need this notification.
    OperatorContext context = getOperatorContext();
    Logger.getLogger(this.getClass())
        .trace(
            "Operator "
                + context.getName()
                + " all ports are ready in PE: "
                + context.getPE().getPEId()
                + " in Job: "
                + context.getPE().getJobId());
  }

  /**
   * Process an incoming tuple that arrived on the specified port.
   *
   * @param stream Port the tuple is arriving on.
   * @param tuple Object representing the incoming tuple.
   * @throws Exception Operator failure, will cause the enclosing PE to terminate.
   */
  @Override
  public void process(StreamingInput<Tuple> stream, Tuple tuple) throws Exception {
    // TODO: Insert code here to process the incoming tuple, typically sending tuple data to an
    // external system or data store.
    // String value = tuple.getString("AttributeName");
  }

  /**
   * Process an incoming punctuation that arrived on the specified port.
   *
   * @param stream Port the punctuation is arriving on.
   * @param mark The punctuation mark
   * @throws Exception Operator failure, will cause the enclosing PE to terminate.
   */
  @Override
  public void processPunctuation(StreamingInput<Tuple> stream, Punctuation mark) throws Exception {
    // TODO: If window punctuations are meaningful to the external system or data store, insert code
    // here to process the incoming punctuation.
  }

  /**
   * Shutdown this operator.
   *
   * @throws Exception Operator failure, will cause the enclosing PE to terminate.
   */
  @Override
  public synchronized void shutdown() throws Exception {
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
